import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { generateAccessToken } from '@/lib/access-token'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'
import { sendFounderSampleNotification } from '@/lib/email'

export const runtime = 'nodejs'

/**
 * Anonymous project creation — used by the public landing's upload + choice
 * flow. No auth required; a random access_token is generated so the user can
 * reach the progress view at /p/[id]?t=[token] without signing in first.
 *
 * For `mode: 'auto'`, the project is created in `awaiting_payment` and a
 * Stripe Checkout session URL is returned. The webhook completes the flow:
 * creates/finds the Supabase user from customer_email, mints a credit,
 * flips the project to `pending`, triggers the worker, and sends a magic
 * link so the user can see their full dashboard.
 *
 * For `mode: 'sample'`, the project is created in `awaiting_manual_processing`
 * and a row is inserted into the waitlist table so it shows up in /admin.
 * The founder is emailed with the CLI command to run.
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    mode: rawMode,
    email: rawEmail,
    video_s3_key,
    video_filename,
    reference_app,
    your_app_name,
  } = body ?? {}

  const mode: 'auto' | 'sample' = rawMode === 'auto' ? 'auto' : 'sample'
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  const refApp = typeof reference_app === 'string' ? reference_app.trim() : ''
  const appName = typeof your_app_name === 'string' && your_app_name.trim() ? your_app_name.trim() : refApp

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (!video_s3_key || typeof video_s3_key !== 'string') {
    return NextResponse.json({ error: 'Missing video key' }, { status: 400 })
  }
  if (!refApp) {
    return NextResponse.json({ error: 'Missing reference app' }, { status: 400 })
  }

  const admin = makeSupabaseServer()
  const accessToken = generateAccessToken()

  // The public landing uploads into the `waitlist-videos` bucket via a
  // signed upload URL (no auth). The worker — both the Railway one for
  // the paid path and `local_worker.py` for the manual path — hardcodes
  // `BUCKET = "spectr-uploads"`. Copy the object across so the worker
  // can read it at `spectr-uploads/<key>` without changes. We keep the
  // original in `waitlist-videos` so the admin dashboard's signed URLs
  // against that bucket continue to work.
  const mp4Key = video_s3_key
  const { error: copyErr } = await admin.storage
    .from('waitlist-videos')
    .copy(mp4Key, mp4Key, { destinationBucket: 'spectr-uploads' })
  if (copyErr) {
    console.error('[projects/anon] bucket copy failed:', copyErr.message)
    return NextResponse.json({ error: 'copy_failed' }, { status: 500 })
  }

  if (mode === 'auto') {
    // ── Paid path: create project, hand back Stripe Checkout URL ──────────
    const { data: inserted, error: insertErr } = await admin
      .from('projects')
      .insert({
        status: 'awaiting_payment',
        processing_mode: 'auto',
        mp4_s3_key: mp4Key,
        reference_app: refApp,
        your_app_name: appName,
        email,
        access_token: accessToken,
      })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      console.error('[projects/anon] insert failed:', insertErr?.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }

    const projectId: string = inserted.id
    const priceId = getEnv('STRIPE_PRICE_ID')
    if (!priceId) {
      return NextResponse.json({ error: 'STRIPE_PRICE_ID not set' }, { status: 500 })
    }
    const siteUrl = getEnv('SITE_URL') || 'https://www.spectr.to'

    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        // Anonymous flow: the webhook resolves the user from this email.
        customer_email: email,
        // client_reference_id is stashed for convenience; the webhook uses
        // metadata.flow to distinguish the anonymous path from the old
        // authenticated `/app` path, which uses user.id here.
        client_reference_id: projectId,
        metadata: {
          flow: 'anon_project',
          project_id: projectId,
        },
        success_url: `${siteUrl}/p/${projectId}?t=${encodeURIComponent(accessToken)}&purchased=1`,
        cancel_url: `${siteUrl}/p/${projectId}?t=${encodeURIComponent(accessToken)}&canceled=1`,
      })

      return NextResponse.json({
        projectId,
        accessToken,
        checkoutUrl: session.url,
      })
    } catch (err: any) {
      console.error('[projects/anon] stripe failed:', err.message)
      // Best effort: leave the project row in awaiting_payment so the user can retry
      return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
    }
  }

  // ── Free-demo path ──────────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await admin
    .from('projects')
    .insert({
      status: 'awaiting_manual_processing',
      processing_mode: 'manual',
      mp4_s3_key: mp4Key,
      reference_app: refApp,
      your_app_name: appName,
      email,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/anon] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  const projectId: string = inserted.id

  // Also insert into waitlist so the admin's existing table shows this row
  // with the same email/video/filename shape that the old waitlist flow used.
  await admin.from('waitlist').insert({
    email,
    video_s3_key: mp4Key,
    video_filename: typeof video_filename === 'string' ? video_filename : null,
    reference_app: refApp,
    your_app_name: appName,
    project_id: projectId,
    mode: 'sample',
    status: 'pending',
  })

  // Non-blocking notification to founder with the CLI command.
  sendFounderSampleNotification({
    projectId,
    userEmail: email,
    referenceApp: refApp,
  }).catch((e) => console.error('[projects/anon] notify failed:', e))

  return NextResponse.json({ projectId, accessToken })
}
