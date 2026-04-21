import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { generateAccessToken } from '@/lib/access-token'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// App Store screenshot download can take ~5–15s for 10 parallel fetches
// before we hand the user off to Stripe. Keep headroom.
export const maxDuration = 60

/**
 * Gallery "Generate your own spec" entry point — called by the modal on
 * every /gallery/[slug] page. Two modes:
 *
 *  - `mode: 'appstore'`   → parse an App Store URL, pull preview screenshots
 *                            from the iTunes lookup API in parallel, store
 *                            them in spectr-uploads/<project_id>/screenshots/,
 *                            create a project with processing_mode='gallery'.
 *
 *  - `mode: 'recording'`  → accepts an MP4 already uploaded to
 *                            waitlist-videos (via /api/waitlist/upload), copies
 *                            it into spectr-uploads, creates a pending project
 *                            with processing_mode='auto' (reuses the existing
 *                            MP4 pipeline).
 *
 * Both modes create the project in status `awaiting_payment`, then hand back
 * a Stripe Checkout URL using the shared $19 STRIPE_PRICE_ID. The existing
 * `checkout.session.completed` webhook (/api/billing/webhook → handleAnonProject)
 * resolves the user by email, mints a consumed credit, flips the project to
 * `pending`, and triggers the worker. That path works verbatim for both
 * processing modes — the worker dispatches on processing_mode internally.
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mode = body?.mode
  if (mode === 'appstore') return handleAppStore(body)
  if (mode === 'recording') return handleRecording(body)
  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}

// ───────────────────────────────────────────────────────────────────────────
// Shared: create a Stripe Checkout session for an already-inserted project row
// ───────────────────────────────────────────────────────────────────────────

function createCheckoutSession(opts: {
  projectId: string
  accessToken: string
  email: string
}) {
  const priceId = getEnv('STRIPE_PRICE_ID')
  if (!priceId) throw new Error('STRIPE_PRICE_ID not set')
  const siteUrl = getEnv('SITE_URL') || 'https://www.spectr.to'

  const stripe = getStripe()
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: opts.email,
    client_reference_id: opts.projectId,
    // flow='anon_project' matches the branch in /api/billing/webhook, so the
    // existing fulfilment logic (user resolve → credit → flip → trigger worker)
    // handles both gallery paths without duplication.
    metadata: {
      flow: 'anon_project',
      project_id: opts.projectId,
    },
    success_url: `${siteUrl}/p/${opts.projectId}?t=${encodeURIComponent(opts.accessToken)}&purchased=1`,
    cancel_url: `${siteUrl}/p/${opts.projectId}?t=${encodeURIComponent(opts.accessToken)}&canceled=1`,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// App Store URL → preview screenshots → project (awaiting_payment → Stripe)
// ───────────────────────────────────────────────────────────────────────────

async function handleAppStore(body: any) {
  const rawUrl = typeof body?.appStoreUrl === 'string' ? body.appStoreUrl.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
  }
  if (!rawUrl) {
    return NextResponse.json({ error: 'Paste an App Store URL.' }, { status: 400 })
  }

  // Accept `.../id123456` URLs, or a bare integer app ID.
  const match = rawUrl.match(/id(\d+)/) || rawUrl.match(/^(\d+)$/)
  if (!match) {
    return NextResponse.json(
      { error: 'That does not look like an App Store URL.' },
      { status: 400 }
    )
  }
  const appId = match[1]
  const countryMatch = rawUrl.match(/apps\.apple\.com\/([a-z]{2})\//i)
  const country = countryMatch ? countryMatch[1].toLowerCase() : 'us'

  // ── iTunes lookup (fast; fail early before creating a project row) ──
  let lookup: any
  try {
    const lookupRes = await fetch(
      `https://itunes.apple.com/lookup?id=${appId}&country=${country}`,
      { cache: 'no-store' }
    )
    if (!lookupRes.ok) {
      return NextResponse.json({ error: 'iTunes lookup failed' }, { status: 502 })
    }
    lookup = await lookupRes.json()
  } catch (e: any) {
    console.error('[projects/gallery] itunes fetch failed:', e?.message)
    return NextResponse.json({ error: 'iTunes lookup failed' }, { status: 502 })
  }

  const app = lookup?.results?.[0]
  if (!app) {
    return NextResponse.json({ error: 'App not found on the App Store.' }, { status: 404 })
  }

  const screenshotUrls: string[] = Array.isArray(app.screenshotUrls)
    ? app.screenshotUrls.slice(0, 20)
    : []
  if (screenshotUrls.length === 0) {
    return NextResponse.json(
      { error: 'This app has no iPhone preview screenshots available.' },
      { status: 422 }
    )
  }

  const appName: string =
    typeof app.trackName === 'string' && app.trackName.trim()
      ? app.trackName.trim()
      : 'Unknown App'

  const admin = makeSupabaseServer()
  const accessToken = generateAccessToken()

  // Create project in awaiting_payment — the Stripe webhook flips it to
  // `pending` and triggers the worker once the checkout session completes.
  const { data: inserted, error: insertErr } = await admin
    .from('projects')
    .insert({
      status: 'awaiting_payment',
      processing_mode: 'gallery',
      reference_app: appName,
      your_app_name: appName,
      email,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/gallery] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const projectId: string = inserted.id

  // ── Fetch + upload screenshots in parallel ──
  // Apple's CDN is reliable enough that parallel fetches save ~10s vs serial.
  // Individual failures don't abort the batch — we just skip that shot.
  const uploads = await Promise.allSettled(
    screenshotUrls.map(async (url, i) => {
      const imgRes = await fetch(url, { cache: 'no-store' })
      if (!imgRes.ok) {
        throw new Error(`non-2xx: ${imgRes.status}`)
      }
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
  const failedCount = uploads.filter((r) => r.status === 'rejected').length
  if (failedCount > 0) {
    console.warn(
      `[projects/gallery] ${failedCount}/${screenshotUrls.length} screenshots failed for ${projectId}`
    )
  }

  if (uploadedCount === 0) {
    await admin
      .from('projects')
      .update({ status: 'failed', error_text: 'All screenshot uploads failed.' })
      .eq('id', projectId)
    return NextResponse.json({ error: 'Could not store any screenshots.' }, { status: 502 })
  }

  await admin.from('projects').update({ frame_count: uploadedCount }).eq('id', projectId)

  try {
    const session = await createCheckoutSession({ projectId, accessToken, email })
    return NextResponse.json({
      projectId,
      accessToken,
      checkoutUrl: session.url,
      screenshotCount: uploadedCount,
    })
  } catch (err: any) {
    console.error('[projects/gallery] stripe failed:', err?.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Screen recording → existing MP4 pipeline (awaiting_payment → Stripe)
// ───────────────────────────────────────────────────────────────────────────

async function handleRecording(body: any) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const video_s3_key: string =
    typeof body?.video_s3_key === 'string' ? body.video_s3_key : ''
  const reference_app: string =
    typeof body?.reference_app === 'string' ? body.reference_app.trim() : ''

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
  }
  if (!video_s3_key) {
    return NextResponse.json({ error: 'Missing video key' }, { status: 400 })
  }
  if (!reference_app) {
    return NextResponse.json({ error: 'Missing reference app' }, { status: 400 })
  }

  const admin = makeSupabaseServer()
  const accessToken = generateAccessToken()

  // Mirror the waitlist-videos → spectr-uploads copy dance used by
  // /api/projects/anon. The worker hardcodes BUCKET='spectr-uploads'.
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

  const { data: inserted, error: insertErr } = await admin
    .from('projects')
    .insert({
      status: 'awaiting_payment',
      processing_mode: 'auto',
      mp4_s3_key: video_s3_key,
      reference_app,
      your_app_name: reference_app,
      email,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/gallery] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const projectId: string = inserted.id

  try {
    const session = await createCheckoutSession({ projectId, accessToken, email })
    return NextResponse.json({
      projectId,
      accessToken,
      checkoutUrl: session.url,
    })
  } catch (err: any) {
    console.error('[projects/gallery] stripe failed:', err?.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}
