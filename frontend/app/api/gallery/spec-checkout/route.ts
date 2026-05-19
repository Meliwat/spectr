import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'
import { isAppSlug } from '@/app/gallery/apps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Per-app spec purchase — sells the pre-made DESIGN.md pack for one app.
 *
 * Distinct from /api/gallery/checkout (which is a prepay to *generate your
 * own* spec). On payment success Stripe redirects to
 * `/gallery/<slug>?purchased=1&session_id=...`; the billing webhook emails
 * the buyer their .md files, and the gallery page also offers a signed-URL
 * download as a spam-folder fallback.
 *
 * Reuses STRIPE_PRICE_ID (same flat price as the generate-your-own flow).
 * The slug rides in session metadata so the webhook knows what to deliver.
 */
export async function POST(req: NextRequest) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // tolerate empty body — slug is validated below
  }

  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!isAppSlug(slug)) {
    return NextResponse.json({ error: 'unknown_app' }, { status: 400 })
  }

  const priceId = getEnv('STRIPE_PRICE_ID')
  if (!priceId) {
    return NextResponse.json({ error: 'STRIPE_PRICE_ID not set' }, { status: 500 })
  }
  const siteUrl = (getEnv('SITE_URL') || 'https://www.spectr.to').replace(/\/$/, '')

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe Checkout collects the buyer email natively — the webhook
      // reads it from customer_details to know where to send the spec.
      metadata: { flow: 'spec_purchase', slug },
      success_url: `${siteUrl}/gallery/${slug}?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/gallery/${slug}?canceled=1`,
    })
    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: any) {
    console.error('[gallery/spec-checkout] stripe failed:', err?.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}
