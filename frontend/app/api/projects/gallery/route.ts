import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { generateAccessToken } from '@/lib/access-token'
import { triggerWorker } from '@/lib/trigger-worker'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Parallel App Store screenshot fetches can run ~5–15s. Give headroom.
export const maxDuration = 60

/**
 * Gallery submission endpoint — step 2 of the pre-pay flow.
 *
 * Called AFTER the user has paid via /api/gallery/checkout. Requires a
 * `session_id` that we verify against Stripe (must be `payment_status=paid`).
 * The session_id itself gates access to spec generation and is de-duped via
 * the spec_credits table's unique `stripe_session_id` index so a single
 * payment can only produce a single project.
 *
 * Two modes:
 *  - `mode: 'appstore'`   → parse App Store URL, pull iTunes preview screenshots
 *                            in parallel, upload to
 *                            spectr-uploads/<project_id>/screenshots/NNN.jpg,
 *                            create project with processing_mode='gallery'.
 *  - `mode: 'recording'`  → MP4 already uploaded to waitlist-videos via the
 *                            existing signed-upload path; we copy it over and
 *                            create a project with processing_mode='auto'.
 *
 * Both then trigger the worker directly — no payment webhook in the critical
 * path, so the flow works regardless of webhook timing.
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Bypass path: gated by NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED ────────────
  // When the env var is anything other than 'true' (unset, '', 'false', etc.)
  // the client may submit { bypass: true, email, mode, ... } and we skip Stripe
  // entirely. A `source='comp'` credit is created so the project still has
  // standard audit / refund machinery available.
  if (body?.bypass === true) {
    const paywallEnabled =
      (process.env.NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED ?? '').replace(/\n/g, '').trim() === 'true'
    if (paywallEnabled) {
      return NextResponse.json({ error: 'Paywall is enabled' }, { status: 402 })
    }
    const email = (body?.email || '').toString().trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }
    const adminBypass = makeSupabaseServer()
    let bypassUserId: string
    try {
      const { data: existing, error: listErr } = await adminBypass.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      })
      if (listErr) throw listErr
      const found = existing.users.find((u) => (u.email ?? '').toLowerCase() === email)
      if (found) {
        bypassUserId = found.id
      } else {
        const { data: created, error: createErr } = await adminBypass.auth.admin.createUser({
          email,
          email_confirm: true,
        })
        if (createErr || !created.user) throw createErr ?? new Error('no user returned')
        bypassUserId = created.user.id
      }
    } catch (err: any) {
      console.error('[projects/gallery] bypass user resolve failed:', err?.message ?? err)
      return NextResponse.json({ error: 'user_resolve_failed' }, { status: 500 })
    }
    const { data: bypassCredit, error: bypassCreditErr } = await adminBypass
      .from('spec_credits')
      .insert({
        user_id: bypassUserId,
        stripe_session_id: null,
        stripe_payment_id: null,
        amount_cents: 0,
        status: 'consumed',
        source: 'comp',
        consumed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (bypassCreditErr) {
      console.error('[projects/gallery] bypass comp credit failed:', bypassCreditErr.message)
      return NextResponse.json({ error: 'credit_failed' }, { status: 500 })
    }
    const bypassCtx: SubmitCtx = {
      userId: bypassUserId,
      email,
      sessionId: 'bypass',
      creditId: bypassCredit!.id,
    }
    const bypassMode = body?.mode
    if (bypassMode === 'appstore') return handleAppStore(adminBypass, body, bypassCtx)
    if (bypassMode === 'recording') return handleRecording(adminBypass, body, bypassCtx)
    await adminBypass.from('spec_credits').delete().eq('id', bypassCtx.creditId)
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const session_id = typeof body?.session_id === 'string' ? body.session_id.trim() : ''
  if (!session_id) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  // ── 1. Verify Stripe session is paid ──────────────────────────────────────
  let session: any
  try {
    const stripe = getStripe()
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch (err: any) {
    console.error('[projects/gallery] session retrieve failed:', err?.message)
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { error: 'Payment not confirmed on this session.' },
      { status: 402 }
    )
  }

  const email: string = (session.customer_email || session.customer_details?.email || '')
    .toString()
    .trim()
    .toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'No email on session' }, { status: 400 })
  }

  const admin = makeSupabaseServer()

  // ── 2. Resolve or create the auth user by email ───────────────────────────
  let userId: string
  try {
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    if (listErr) throw listErr
    const found = existing.users.find(
      (u) => (u.email ?? '').toLowerCase() === email
    )
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
    console.error('[projects/gallery] user resolve failed:', err?.message ?? err)
    return NextResponse.json({ error: 'user_resolve_failed' }, { status: 500 })
  }

  // ── 3. De-dup: claim the session_id via spec_credits (unique index) ──────
  // If this insert errors with a unique violation, another submit already
  // consumed this session → reject, one spec per payment.
  const { data: credit, error: creditErr } = await admin
    .from('spec_credits')
    .insert({
      user_id: userId,
      stripe_session_id: session_id,
      stripe_payment_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      amount_cents: session.amount_total,
      status: 'consumed',
      source: 'stripe',
      consumed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (creditErr) {
    if ((creditErr as any).code === '23505') {
      return NextResponse.json(
        { error: 'This payment was already used. Check your email for the project link.' },
        { status: 409 }
      )
    }
    console.error('[projects/gallery] credit insert failed:', creditErr.message)
    return NextResponse.json({ error: 'credit_failed' }, { status: 500 })
  }

  // ── 4. Dispatch based on mode ────────────────────────────────────────────
  const mode = body?.mode
  if (mode === 'appstore') {
    return handleAppStore(admin, body, { userId, email, sessionId: session_id, creditId: credit!.id })
  }
  if (mode === 'recording') {
    return handleRecording(admin, body, { userId, email, sessionId: session_id, creditId: credit!.id })
  }

  // Unknown mode — roll back the credit so the user can retry.
  await admin.from('spec_credits').delete().eq('id', credit!.id)
  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}

type SubmitCtx = {
  userId: string
  email: string
  sessionId: string
  creditId: string
}

// ───────────────────────────────────────────────────────────────────────────
// App Store URL → preview screenshots → project
// ───────────────────────────────────────────────────────────────────────────

async function handleAppStore(admin: any, body: any, ctx: SubmitCtx) {
  const rawUrl = typeof body?.appStoreUrl === 'string' ? body.appStoreUrl.trim() : ''
  if (!rawUrl) {
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json({ error: 'Paste an App Store URL.' }, { status: 400 })
  }
  const match = rawUrl.match(/id(\d+)/) || rawUrl.match(/^(\d+)$/)
  if (!match) {
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json(
      { error: 'That does not look like an App Store URL.' },
      { status: 400 }
    )
  }
  const appId = match[1]
  const countryMatch = rawUrl.match(/apps\.apple\.com\/([a-z]{2})\//i)
  const country = countryMatch ? countryMatch[1].toLowerCase() : 'us'

  let lookup: any
  try {
    const lookupRes = await fetch(
      `https://itunes.apple.com/lookup?id=${appId}&country=${country}`,
      { cache: 'no-store' }
    )
    if (!lookupRes.ok) throw new Error(`HTTP ${lookupRes.status}`)
    lookup = await lookupRes.json()
  } catch (e: any) {
    console.error('[projects/gallery] itunes fetch failed:', e?.message)
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json({ error: 'iTunes lookup failed' }, { status: 502 })
  }

  const app = lookup?.results?.[0]
  if (!app) {
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json({ error: 'App not found on the App Store.' }, { status: 404 })
  }

  const screenshotUrls: string[] = Array.isArray(app.screenshotUrls)
    ? app.screenshotUrls.slice(0, 20)
    : []
  if (screenshotUrls.length === 0) {
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json(
      { error: 'This app has no iPhone preview screenshots available.' },
      { status: 422 }
    )
  }

  const appName: string =
    typeof app.trackName === 'string' && app.trackName.trim()
      ? app.trackName.trim()
      : 'Unknown App'

  const accessToken = generateAccessToken()

  // Create project in `pending` — webhook isn't in the loop anymore, we kick
  // the worker ourselves.
  const { data: inserted, error: insertErr } = await admin
    .from('projects')
    .insert({
      status: 'pending',
      processing_mode: 'gallery',
      reference_app: appName,
      your_app_name: appName,
      email: ctx.email,
      user_id: ctx.userId,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/gallery] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const projectId: string = inserted.id

  // Link the credit to this project for audit.
  await admin.from('spec_credits').update({ project_id: projectId }).eq('id', ctx.creditId)

  // Fetch + upload screenshots in parallel.
  const uploads = await Promise.allSettled(
    screenshotUrls.map(async (url, i) => {
      const imgRes = await fetch(url, { cache: 'no-store' })
      if (!imgRes.ok) throw new Error(`non-2xx: ${imgRes.status}`)
      const buf = Buffer.from(await imgRes.arrayBuffer())
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : 'jpg'
      const key = `${projectId}/screenshots/${String(i).padStart(3, '0')}.${ext}`
      const { error: upErr } = await admin.storage
        .from('spectr-uploads')
        .upload(key, buf, { contentType, upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      return i
    })
  )
  const uploadedCount = uploads.filter((r) => r.status === 'fulfilled').length

  if (uploadedCount === 0) {
    await admin
      .from('projects')
      .update({ status: 'failed', error_text: 'All screenshot uploads failed.' })
      .eq('id', projectId)
    return NextResponse.json({ error: 'Could not store any screenshots.' }, { status: 502 })
  }

  await admin.from('projects').update({ frame_count: uploadedCount }).eq('id', projectId)

  await triggerWorker(projectId)

  return NextResponse.json({
    projectId,
    accessToken,
    screenshotCount: uploadedCount,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// Screen recording → existing MP4 pipeline
// ───────────────────────────────────────────────────────────────────────────

async function handleRecording(admin: any, body: any, ctx: SubmitCtx) {
  const video_s3_key: string =
    typeof body?.video_s3_key === 'string' ? body.video_s3_key : ''
  const reference_app: string =
    typeof body?.reference_app === 'string' ? body.reference_app.trim() : ''

  if (!video_s3_key) {
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json({ error: 'Missing video key' }, { status: 400 })
  }
  if (!reference_app) {
    await rollbackCredit(admin, ctx.creditId)
    return NextResponse.json({ error: 'Missing reference app' }, { status: 400 })
  }

  // Copy waitlist-videos → spectr-uploads; idempotent on retry.
  const copyRes = await admin.storage
    .from('waitlist-videos')
    .copy(video_s3_key, video_s3_key, { destinationBucket: 'spectr-uploads' })
  if (copyRes.error) {
    const msg = (copyRes.error.message || '').toLowerCase()
    const alreadyExists =
      msg.includes('already exists') ||
      msg.includes('duplicate') ||
      msg.includes('resource already')
    if (!alreadyExists) {
      console.error('[projects/gallery] copy failed:', copyRes.error.message)
      return NextResponse.json({ error: 'copy_failed' }, { status: 500 })
    }
  }

  const accessToken = generateAccessToken()

  const { data: inserted, error: insertErr } = await admin
    .from('projects')
    .insert({
      status: 'pending',
      processing_mode: 'auto',
      mp4_s3_key: video_s3_key,
      reference_app,
      your_app_name: reference_app,
      email: ctx.email,
      user_id: ctx.userId,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/gallery] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const projectId: string = inserted.id

  await admin.from('spec_credits').update({ project_id: projectId }).eq('id', ctx.creditId)

  await triggerWorker(projectId)

  return NextResponse.json({ projectId, accessToken })
}

async function rollbackCredit(admin: any, creditId: string) {
  await admin.from('spec_credits').delete().eq('id', creditId)
}
