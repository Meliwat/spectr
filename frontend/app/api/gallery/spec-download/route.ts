import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { isAppSlug } from '@/app/gallery/apps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SPECS_BUCKET = 'specs'
const SIGNED_URL_TTL = 3600 // 1h — buyer is on the success page right now

const PAYWALL_ENABLED =
  getEnv('NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED') === 'true'

/**
 * Spam-folder fallback for a per-app spec purchase. The buyer is emailed
 * their .md files by the billing webhook; the gallery success page also
 * calls this to render direct download links so a missed email is never a
 * lost purchase.
 *
 * Access:
 *  - `?session_id=...`  Stripe session must be paid + flow=spec_purchase;
 *                       the slug is taken from the session metadata (not the
 *                       query) so it can't be tampered with.
 *  - `?slug=...`        Only honored when the gallery paywall is disabled
 *                       (local dev) — the same escape hatch GenerateSpecButton
 *                       uses. Never trusted in production.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  const querySlug = (req.nextUrl.searchParams.get('slug') ?? '').trim()

  let slug = ''

  if (sessionId) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (
        session.payment_status !== 'paid' ||
        (session.metadata?.flow ?? '') !== 'spec_purchase'
      ) {
        return NextResponse.json({ error: 'not_paid' }, { status: 403 })
      }
      slug = (session.metadata?.slug ?? '').trim()
    } catch {
      return NextResponse.json({ error: 'invalid_session' }, { status: 403 })
    }
  } else if (!PAYWALL_ENABLED && querySlug) {
    slug = querySlug
  } else {
    return NextResponse.json({ error: 'missing_session' }, { status: 400 })
  }

  if (!isAppSlug(slug)) {
    return NextResponse.json({ error: 'unknown_app' }, { status: 404 })
  }

  const admin = makeSupabaseServer()

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
  if (names.length === 0) {
    return NextResponse.json({ error: 'no_files' }, { status: 404 })
  }

  const { data: signed, error: signErr } = await admin
    .storage.from(SPECS_BUCKET)
    .createSignedUrls(names.map((n) => `${slug}/${n}`), SIGNED_URL_TTL)
  if (signErr || !signed) {
    console.error('[gallery/spec-download] sign failed', slug, signErr?.message)
    return NextResponse.json({ error: 'sign_error' }, { status: 500 })
  }

  const files = signed
    .filter((s) => s.signedUrl && !s.error)
    .map((s) => {
      const name = (s.path ?? '').split('/').pop() ?? 'DESIGN.md'
      // Force a download instead of rendering the markdown inline in the tab.
      return { name, url: `${s.signedUrl}&download=${encodeURIComponent(name)}` }
    })

  return NextResponse.json(
    { slug, files },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
