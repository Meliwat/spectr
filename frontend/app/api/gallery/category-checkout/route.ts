import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'
import { isCategorySlug } from '@/app/gallery/categories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Category bundle purchase — sells every app's spec pack in one category
 * ("Get all social app specs"). Higher price than a single app.
 *
 * On payment success Stripe redirects back to the originating page with
 * `?purchased=cat&session_id=...`; the billing webhook emails a download
 * link and the page renders all the category's specs as a fallback.
 *
 * Uses STRIPE_PRICE_ID_CATEGORY (the $4 bundle price). The category rides
 * in session metadata so the webhook + download route know what to unlock.
 */
export async function POST(req: NextRequest) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // tolerate empty body — category is validated below
  }

  const category = typeof body?.category === 'string' ? body.category.trim() : ''
  if (!isCategorySlug(category)) {
    return NextResponse.json({ error: 'unknown_category' }, { status: 400 })
  }

  // Land the buyer back where they started. Must be site-relative to prevent
  // an open redirect (mirrors /api/gallery/checkout).
  const returnPath =
    typeof body?.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : `/gallery/${category}`

  const priceId = getEnv('STRIPE_PRICE_ID_CATEGORY')
  if (!priceId) {
    return NextResponse.json({ error: 'STRIPE_PRICE_ID_CATEGORY not set' }, { status: 500 })
  }
  const siteUrl = (getEnv('SITE_URL') || 'https://www.spectr.to').replace(/\/$/, '')
  const sep = returnPath.includes('?') ? '&' : '?'

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { flow: 'category_purchase', category },
      success_url: `${siteUrl}${returnPath}${sep}purchased=cat&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${returnPath}${sep}canceled=1`,
    })
    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: any) {
    console.error('[gallery/category-checkout] stripe failed:', err?.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}
