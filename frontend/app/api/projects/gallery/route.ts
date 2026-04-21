import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { generateAccessToken } from '@/lib/access-token'
import { triggerWorker } from '@/lib/trigger-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// App Store screenshot download can be slow on large listings; give it room.
export const maxDuration = 60

/**
 * Public, no-paywall entry point used by the gallery "Generate your own spec"
 * modal. Two modes:
 *
 *  - `mode: 'appstore'`   → parse an App Store URL, pull preview screenshots
 *                            from the iTunes lookup API, store them in
 *                            spectr-uploads/<project_id>/screenshots/, create
 *                            a project row with processing_mode='gallery',
 *                            trigger the worker.
 *
 *  - `mode: 'recording'`  → accepts an MP4 already uploaded to
 *                            waitlist-videos (via /api/waitlist/upload), copies
 *                            it into spectr-uploads, creates a pending project
 *                            with processing_mode='auto' (reuses the existing
 *                            MP4 pipeline), triggers the worker.
 *
 * Bypasses auth and billing entirely — this is the free demo path.
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
// App Store URL → preview screenshots → project
// ───────────────────────────────────────────────────────────────────────────

async function handleAppStore(body: any) {
  const rawUrl = typeof body?.appStoreUrl === 'string' ? body.appStoreUrl.trim() : ''
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing appStoreUrl' }, { status: 400 })
  }

  // App IDs show up in URLs like .../id123456789 or as a bare integer.
  const match = rawUrl.match(/id(\d+)/) || rawUrl.match(/^(\d+)$/)
  if (!match) {
    return NextResponse.json({ error: 'That does not look like an App Store URL.' }, { status: 400 })
  }
  const appId = match[1]

  // Country code — default to us, honour any /xx/ prefix in the URL.
  const countryMatch = rawUrl.match(/apps\.apple\.com\/([a-z]{2})\//i)
  const country = countryMatch ? countryMatch[1].toLowerCase() : 'us'

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

  // iTunes returns `screenshotUrls` (iPhone). Cap the list so we don't run up
  // the vision-API bill on a listing with 20 shots.
  const screenshotUrls: string[] = Array.isArray(app.screenshotUrls)
    ? app.screenshotUrls.slice(0, 20)
    : []
  if (screenshotUrls.length === 0) {
    return NextResponse.json(
      { error: 'This app has no iPhone preview screenshots available.' },
      { status: 422 }
    )
  }

  const appName: string = typeof app.trackName === 'string' && app.trackName.trim()
    ? app.trackName.trim()
    : 'Unknown App'

  const admin = makeSupabaseServer()
  const accessToken = generateAccessToken()

  // Create the project row first so we have a canonical id to use as the
  // storage prefix. Status stays `pending` — the worker flips it to
  // `extracting` when it picks the job up.
  const { data: inserted, error: insertErr } = await admin
    .from('projects')
    .insert({
      status: 'pending',
      processing_mode: 'gallery',
      reference_app: appName,
      your_app_name: appName,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/gallery] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const projectId: string = inserted.id

  // Download each screenshot and push it into spectr-uploads. We deliberately
  // fetch sequentially — parallel fetches against Apple's CDN are unreliable
  // and 10 images is fast enough to do in order.
  let uploadedCount = 0
  for (let i = 0; i < screenshotUrls.length; i++) {
    const url = screenshotUrls[i]
    try {
      const imgRes = await fetch(url, { cache: 'no-store' })
      if (!imgRes.ok) {
        console.warn(`[projects/gallery] screenshot ${i} fetch non-2xx: ${imgRes.status}`)
        continue
      }
      const buf = Buffer.from(await imgRes.arrayBuffer())
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : 'jpg'
      const key = `${projectId}/screenshots/${String(i).padStart(3, '0')}.${ext}`
      const { error: upErr } = await admin.storage
        .from('spectr-uploads')
        .upload(key, buf, { contentType, upsert: true })
      if (upErr) {
        console.warn(`[projects/gallery] screenshot ${i} upload failed: ${upErr.message}`)
        continue
      }
      uploadedCount++
    } catch (e: any) {
      console.warn(`[projects/gallery] screenshot ${i} error: ${e?.message}`)
    }
  }

  if (uploadedCount === 0) {
    await admin
      .from('projects')
      .update({ status: 'failed', error_text: 'All screenshot uploads failed.' })
      .eq('id', projectId)
    return NextResponse.json({ error: 'Could not store any screenshots.' }, { status: 502 })
  }

  await admin
    .from('projects')
    .update({ frame_count: uploadedCount })
    .eq('id', projectId)

  // Fire-and-await so a failure here surfaces before we return. triggerWorker
  // handles its own logging + \n-stripping; see lib/trigger-worker.ts.
  await triggerWorker(projectId)

  return NextResponse.json({ projectId, accessToken, screenshotCount: uploadedCount })
}

// ───────────────────────────────────────────────────────────────────────────
// MP4 recording → existing pipeline, no paywall
// ───────────────────────────────────────────────────────────────────────────

async function handleRecording(body: any) {
  const video_s3_key: string = typeof body?.video_s3_key === 'string' ? body.video_s3_key : ''
  const video_filename: string | null =
    typeof body?.video_filename === 'string' ? body.video_filename : null
  const reference_app: string =
    typeof body?.reference_app === 'string' ? body.reference_app.trim() : ''

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
      status: 'pending',
      processing_mode: 'auto',
      mp4_s3_key: video_s3_key,
      reference_app,
      your_app_name: reference_app,
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[projects/gallery] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  const projectId: string = inserted.id

  await triggerWorker(projectId)

  return NextResponse.json({ projectId, accessToken, videoFilename: video_filename })
}
