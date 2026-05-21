import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { isAppSlug, TITLES } from '@/app/gallery/apps'
import { isCategorySlug, CATEGORY_APPS } from '@/app/gallery/categories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SPECS_BUCKET = 'specs'
const SIGNED_URL_TTL = 3600 // 1h — buyer is on the success page right now

// Gallery is free. Hardcoded so the ?slug/?category bypass paths are always honored.
const PAYWALL_ENABLED = false

type AppFiles = { slug: string; name: string; files: { name: string; url: string }[] }

/**
 * Fallback download for a paid purchase — used by the gallery success page
 * so a missed/spam-foldered email is never a lost purchase. Handles both:
 *  - spec_purchase    → one app's files
 *  - category_purchase → every app's files in the purchased category
 *
 * Returns a unified shape: { scope, category?, apps: [{slug,name,files}] }.
 *
 * Access:
 *  - `?session_id=...`  Stripe session must be paid; the app/category is read
 *                       from session metadata (not the query) so it can't be
 *                       tampered with.
 *  - `?slug=` / `?category=`  Only when the paywall is disabled (local dev).
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  const qSlug = (req.nextUrl.searchParams.get('slug') ?? '').trim()
  const qCat = (req.nextUrl.searchParams.get('category') ?? '').trim()

  let scope: 'app' | 'category' = 'app'
  let category = ''
  let targetSlugs: string[] = []

  if (sessionId) {
    let session
    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId)
    } catch {
      return NextResponse.json({ error: 'invalid_session' }, { status: 403 })
    }
    const flow = session.metadata?.flow ?? ''
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'not_paid' }, { status: 403 })
    }
    if (flow === 'spec_purchase') {
      const slug = (session.metadata?.slug ?? '').trim()
      if (!isAppSlug(slug)) return NextResponse.json({ error: 'unknown_app' }, { status: 404 })
      scope = 'app'
      targetSlugs = [slug]
    } else if (flow === 'category_purchase') {
      category = (session.metadata?.category ?? '').trim()
      if (!isCategorySlug(category)) {
        return NextResponse.json({ error: 'unknown_category' }, { status: 404 })
      }
      scope = 'category'
      targetSlugs = CATEGORY_APPS[category].slice()
    } else {
      return NextResponse.json({ error: 'not_paid' }, { status: 403 })
    }
  } else if (!PAYWALL_ENABLED && qCat) {
    if (!isCategorySlug(qCat)) return NextResponse.json({ error: 'unknown_category' }, { status: 404 })
    scope = 'category'
    category = qCat
    targetSlugs = CATEGORY_APPS[qCat].slice()
  } else if (!PAYWALL_ENABLED && qSlug) {
    if (!isAppSlug(qSlug)) return NextResponse.json({ error: 'unknown_app' }, { status: 404 })
    targetSlugs = [qSlug]
  } else {
    return NextResponse.json({ error: 'missing_session' }, { status: 400 })
  }

  const admin = makeSupabaseServer()

  // Collect every DESIGN*.md path across the target app(s).
  // Plain arrays/objects only — the repo's tsconfig targets es5, so Map/Set
  // iteration isn't available.
  const groups: { slug: string; names: string[] }[] = []
  for (const slug of targetSlugs) {
    const { data: listing, error: listErr } = await admin
      .storage.from(SPECS_BUCKET).list(slug)
    if (listErr) {
      console.error('[gallery/spec-download] list failed', slug, listErr.message)
      return NextResponse.json({ error: 'storage_error' }, { status: 500 })
    }
    const names = (listing ?? [])
      .map((o) => o.name)
      .filter((n) => /^DESIGN.*\.md$/i.test(n))
      .sort()
    if (names.length) groups.push({ slug, names })
  }

  const allPaths: string[] = []
  for (const g of groups) for (const n of g.names) allPaths.push(`${g.slug}/${n}`)
  if (allPaths.length === 0) {
    return NextResponse.json({ error: 'no_files' }, { status: 404 })
  }

  // Sign in chunks (category bundles can be ~90 paths).
  const signedByPath: Record<string, string> = {}
  for (let i = 0; i < allPaths.length; i += 50) {
    const chunk = allPaths.slice(i, i + 50)
    const { data: signed, error: signErr } = await admin
      .storage.from(SPECS_BUCKET).createSignedUrls(chunk, SIGNED_URL_TTL)
    if (signErr || !signed) {
      console.error('[gallery/spec-download] sign failed', signErr?.message)
      return NextResponse.json({ error: 'sign_error' }, { status: 500 })
    }
    for (const s of signed) {
      if (s.signedUrl && !s.error && s.path) signedByPath[s.path] = s.signedUrl
    }
  }

  const apps: AppFiles[] = []
  for (const g of groups) {
    const files = g.names
      .map((n) => {
        const url = signedByPath[`${g.slug}/${n}`]
        return url ? { name: n, url: `${url}&download=${encodeURIComponent(n)}` } : null
      })
      .filter((f): f is { name: string; url: string } => f !== null)
    if (files.length) {
      apps.push({ slug: g.slug, name: TITLES[g.slug as keyof typeof TITLES] ?? g.slug, files })
    }
  }

  return NextResponse.json(
    { scope, category: category || undefined, apps },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
