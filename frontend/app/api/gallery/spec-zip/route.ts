import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { isAppSlug } from '@/app/gallery/apps'
import { isCategorySlug, CATEGORY_APPS } from '@/app/gallery/categories'
import { buildZip, type ZipEntry } from '@/lib/zip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SPECS_BUCKET = 'specs'
// Gallery is free. Hardcoded so the ?slug/?category bypass paths are always honored.
const PAYWALL_ENABLED = false

/**
 * One .zip of every DESIGN*.md for a paid purchase — a single app or an
 * entire category bundle. Files are nested as <slug>/<file> inside the zip.
 *
 * Auth mirrors spec-download: a paid Stripe session (app/category read from
 * its metadata, not the query), or ?slug=/?category= only when the paywall
 * is disabled (local dev).
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  const qSlug = (req.nextUrl.searchParams.get('slug') ?? '').trim()
  const qCat = (req.nextUrl.searchParams.get('category') ?? '').trim()

  let label = 'specs'
  let targetSlugs: string[] = []

  if (sessionId) {
    let session
    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId)
    } catch {
      return NextResponse.json({ error: 'invalid_session' }, { status: 403 })
    }
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'not_paid' }, { status: 403 })
    }
    const flow = session.metadata?.flow ?? ''
    if (flow === 'spec_purchase') {
      const slug = (session.metadata?.slug ?? '').trim()
      if (!isAppSlug(slug)) return NextResponse.json({ error: 'unknown_app' }, { status: 404 })
      targetSlugs = [slug]
      label = slug
    } else if (flow === 'category_purchase') {
      const cat = (session.metadata?.category ?? '').trim()
      if (!isCategorySlug(cat)) {
        return NextResponse.json({ error: 'unknown_category' }, { status: 404 })
      }
      targetSlugs = CATEGORY_APPS[cat].slice()
      label = cat
    } else {
      return NextResponse.json({ error: 'not_paid' }, { status: 403 })
    }
  } else if (!PAYWALL_ENABLED && qCat) {
    if (!isCategorySlug(qCat)) return NextResponse.json({ error: 'unknown_category' }, { status: 404 })
    targetSlugs = CATEGORY_APPS[qCat].slice()
    label = qCat
  } else if (!PAYWALL_ENABLED && qSlug) {
    if (!isAppSlug(qSlug)) return NextResponse.json({ error: 'unknown_app' }, { status: 404 })
    targetSlugs = [qSlug]
    label = qSlug
  } else {
    return NextResponse.json({ error: 'missing_session' }, { status: 400 })
  }

  const admin = makeSupabaseServer()
  const entries: ZipEntry[] = []

  for (const slug of targetSlugs) {
    const { data: listing, error: listErr } = await admin
      .storage.from(SPECS_BUCKET).list(slug)
    if (listErr) {
      console.error('[gallery/spec-zip] list failed', slug, listErr.message)
      return NextResponse.json({ error: 'storage_error' }, { status: 500 })
    }
    const names = (listing ?? [])
      .map((o) => o.name)
      .filter((n) => /^DESIGN.*\.md$/i.test(n))
      .sort()
    for (const name of names) {
      const { data: blob, error: dlErr } = await admin
        .storage.from(SPECS_BUCKET).download(`${slug}/${name}`)
      if (dlErr || !blob) {
        console.error('[gallery/spec-zip] download failed', `${slug}/${name}`, dlErr?.message)
        return NextResponse.json({ error: 'storage_error' }, { status: 500 })
      }
      entries.push({ name: `${slug}/${name}`, data: Buffer.from(await blob.arrayBuffer()) })
    }
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: 'no_files' }, { status: 404 })
  }

  const zip = buildZip(entries)
  const body = new Uint8Array(zip) // NextResponse BodyInit accepts ArrayBufferView, not Node Buffer
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="spectr-${label}-specs.zip"`,
      'Content-Length': String(body.length),
      'Cache-Control': 'no-store',
    },
  })
}
