import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { getEnv } from '@/lib/env'
import { triggerWorker } from '@/lib/trigger-worker'
import { sendSpecDelivery } from '@/lib/email'
import { isAppSlug, TITLES } from '@/app/gallery/apps'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return new NextResponse('Missing stripe-signature', { status: 400 })
  }

  const secret = getEnv('STRIPE_WEBHOOK_SECRET')
  if (!secret) {
    console.error('[billing/webhook] STRIPE_WEBHOOK_SECRET not set')
    return new NextResponse('Misconfigured', { status: 500 })
  }

  const body = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    console.error('[billing/webhook] signature check failed:', err.message)
    return new NextResponse('Bad signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new NextResponse('ok', { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const flow = (session.metadata?.flow ?? '').trim()

  if (flow === 'anon_project') {
    return handleAnonProject(session)
  }

  // The gallery pre-pay flow (/api/gallery/checkout) is fulfilled synchronously
  // by /api/projects/gallery using stripe.checkout.sessions.retrieve() +
  // spec_credits unique index. The webhook is just a safety net here — reply
  // 200 so Stripe doesn't retry.
  if (flow === 'gallery_prepay') {
    return new NextResponse('ok (gallery_prepay handled synchronously)', { status: 200 })
  }

  if (flow === 'spec_purchase') {
    return handleSpecPurchase(session)
  }

  // ── Legacy / authenticated path ──────────────────────────────────────────
  return handleAuthenticated(session)
}

/**
 * Anonymous paid flow: client_reference_id / metadata.project_id points at
 * a pre-created project row. Resolve the user by email (creating one if
 * needed), mint + consume a credit linked to the project, flip the project
 * to `pending`, trigger the worker, and send a magic-link email so the
 * buyer can access their account dashboard.
 */
async function handleAnonProject(session: Stripe.Checkout.Session): Promise<NextResponse> {
  const projectId = (session.metadata?.project_id ?? session.client_reference_id ?? '').trim()
  const email = (session.customer_email ?? session.customer_details?.email ?? '').trim().toLowerCase()

  if (!projectId) {
    console.error('[billing/webhook] anon: missing project_id', session.id)
    return new NextResponse('No project id', { status: 400 })
  }
  if (!email) {
    console.error('[billing/webhook] anon: missing email', session.id)
    return new NextResponse('No email', { status: 400 })
  }

  const admin = makeSupabaseServer()

  // ─── 1. Resolve or create the Supabase auth user by email ─────────────
  let userId: string
  try {
    // Supabase has no "find by email" admin helper; list users filtered
    // via the REST admin endpoint by paging. For low volume this page is
    // trivial; when usage grows, persist an `email → user_id` lookup.
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (listErr) throw listErr
    const found = existing.users.find((u) => (u.email ?? '').toLowerCase() === email)

    if (found) {
      userId = found.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createErr || !created.user) throw createErr ?? new Error('no user returned')
      userId = created.user.id
    }
  } catch (err: any) {
    console.error('[billing/webhook] anon: user resolve failed:', err?.message ?? err)
    return new NextResponse('user_resolve_failed', { status: 500 })
  }

  // ─── 2. Claim the project for this user + flip status ─────────────────
  const { data: project, error: projErr } = await admin
    .from('projects')
    .select('id, status, user_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projErr || !project) {
    console.error('[billing/webhook] anon: project not found', projectId)
    return new NextResponse('project_not_found', { status: 404 })
  }

  // Idempotent: if this webhook already fired (Stripe retries), the project
  // is already past awaiting_payment; short-circuit without re-triggering.
  if (project.status !== 'awaiting_payment') {
    console.log('[billing/webhook] anon: project already processed', projectId, project.status)
    return new NextResponse('ok', { status: 200 })
  }

  // ─── 3. Upsert a credit row (idempotent on session id), consume it ─────
  const paymentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null

  const { data: credit, error: creditErr } = await admin
    .from('spec_credits')
    .upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_id: paymentId,
        amount_cents: session.amount_total,
        status: 'consumed',
        source: 'stripe',
        project_id: projectId,
        consumed_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_session_id' },
    )
    .select('id')
    .single()

  if (creditErr) {
    console.error('[billing/webhook] anon: credit upsert failed:', creditErr.message)
    return new NextResponse('credit_failed', { status: 500 })
  }

  // ─── 4. Flip project to pending + attach user_id ──────────────────────
  const { error: updErr } = await admin
    .from('projects')
    .update({
      status: 'pending',
      user_id: userId,
    })
    .eq('id', projectId)
    .eq('status', 'awaiting_payment')  // guard against double-update

  if (updErr) {
    console.error('[billing/webhook] anon: project update failed:', updErr.message)
    return new NextResponse('project_update_failed', { status: 500 })
  }

  // ─── 5. Trigger the worker ────────────────────────────────────────────
  await triggerWorker(projectId)

  // ─── 6. Send magic link so user can access their dashboard ────────────
  try {
    const siteUrl = getEnv('SITE_URL') || 'https://www.spectr.to'
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/auth/callback?next=/app/projects` },
    })
    if (linkErr) console.error('[billing/webhook] magic link failed:', linkErr.message)
  } catch (err: any) {
    console.error('[billing/webhook] magic link threw:', err?.message ?? err)
  }

  console.log('[billing/webhook] anon: fulfilled project', projectId, 'for', email)
  return new NextResponse('ok', { status: 200 })
}

const SPECS_BUCKET = 'specs'

/**
 * Per-app spec purchase: read the slug from session metadata, pull every
 * DESIGN*.md for that app out of the private `specs` bucket, and email them
 * to the buyer as attachments.
 *
 * Failure policy: a transient storage error returns 500 so Stripe retries
 * (delivery is at-least-once). An email-send failure is logged but still
 * returns 200 — Stripe must not retry forever, and the gallery success page
 * exposes the same files via signed URL as the spam-folder fallback.
 */
async function handleSpecPurchase(session: Stripe.Checkout.Session): Promise<NextResponse> {
  const slug = (session.metadata?.slug ?? '').trim()
  const email = (session.customer_details?.email ?? session.customer_email ?? '')
    .trim()
    .toLowerCase()

  if (!isAppSlug(slug)) {
    console.error('[billing/webhook] spec: bad slug', slug, session.id)
    return new NextResponse('bad slug', { status: 400 })
  }
  if (!email) {
    console.error('[billing/webhook] spec: missing email', session.id)
    return new NextResponse('No email', { status: 400 })
  }

  const admin = makeSupabaseServer()

  const { data: listing, error: listErr } = await admin
    .storage.from(SPECS_BUCKET).list(slug)
  if (listErr) {
    console.error('[billing/webhook] spec: list failed', slug, listErr.message)
    return new NextResponse('storage_list_failed', { status: 500 })
  }

  const specNames = (listing ?? [])
    .map((o) => o.name)
    .filter((n) => /^DESIGN.*\.md$/i.test(n))
  if (specNames.length === 0) {
    console.error('[billing/webhook] spec: no files in bucket for', slug)
    return new NextResponse('no_spec_files', { status: 500 })
  }

  const files: { filename: string; content: Buffer }[] = []
  for (const name of specNames) {
    const { data: blob, error: dlErr } = await admin
      .storage.from(SPECS_BUCKET).download(`${slug}/${name}`)
    if (dlErr || !blob) {
      console.error('[billing/webhook] spec: download failed', `${slug}/${name}`, dlErr?.message)
      return new NextResponse('storage_download_failed', { status: 500 })
    }
    files.push({ filename: name, content: Buffer.from(await blob.arrayBuffer()) })
  }

  const ok = await sendSpecDelivery({ to: email, appName: TITLES[slug], files })
  if (!ok) {
    console.error('[billing/webhook] spec: email failed but acking', slug, email, session.id)
    return new NextResponse('ok (email failed, fallback available)', { status: 200 })
  }

  console.log('[billing/webhook] spec: delivered', slug, 'to', email)
  return new NextResponse('ok', { status: 200 })
}

/**
 * Legacy authenticated path: client_reference_id is a Supabase user.id, and
 * the caller already has a project row from the old `/app` upload flow.
 * Mint an available credit and let `/api/projects` consume it on submit.
 */
async function handleAuthenticated(session: Stripe.Checkout.Session): Promise<NextResponse> {
  const userId = session.client_reference_id
  if (!userId) {
    console.error('[billing/webhook] no client_reference_id on session', session.id)
    return new NextResponse('No user id', { status: 400 })
  }

  const admin = makeSupabaseServer()
  const { error } = await admin
    .from('spec_credits')
    .upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
        amount_cents: session.amount_total,
        status: 'available',
        source: 'stripe',
      },
      { onConflict: 'stripe_session_id' },
    )

  if (error) {
    console.error('[billing/webhook] db write failed:', error.message)
    return new NextResponse('db error', { status: 500 })
  }

  console.log('[billing/webhook] credit issued for user', userId, 'session', session.id)
  return new NextResponse('ok', { status: 200 })
}
