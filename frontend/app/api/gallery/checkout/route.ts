import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Gallery "Generate your own spec" — step 1: collect email and hand the user
 * off to Stripe Checkout BEFORE they've picked App Store URL vs MP4.
 *
 * On payment success, Stripe redirects back to `${returnPath}?paid=1&session_id=...`
 * where the button client component detects the params and re-opens the modal
 * in "submission" state — user then chooses their input, which hits
 * POST /api/projects/gallery to actually create the project + trigger worker.
 *
 * We intentionally do NOT create a project row here. That happens post-payment
 * so the user only commits to a concrete flow (App Store vs MP4) after they've
 * paid — and so abandoned checkouts don't leak empty projects.
 */
export async function POST(req: NextRequest) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // no body is fine — everything is optional
  }

  // Accept the referring path so the post-payment redirect lands back on the
  // same gallery detail page. Must start with `/` to prevent open-redirects.
  const returnPath =
    typeof body?.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : '/'

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
      // Stripe collects email natively in Checkout — no pre-prompt here.
      // flow='gallery_prepay' tells the webhook this session will be consumed
      // synchronously by /api/projects/gallery — the webhook treats it as a
      // no-op so it doesn't try to fulfil anything.
      metadata: { flow: 'gallery_prepay' },
      success_url: `${siteUrl}${returnPath}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${returnPath}?canceled=1`,
    })
    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: any) {
    console.error('[gallery/checkout] stripe failed:', err?.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}
