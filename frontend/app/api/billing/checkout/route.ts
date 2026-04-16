import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getStripe } from '@/lib/stripe'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

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
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${siteUrl}/app?purchased=1`,
      cancel_url: `${siteUrl}/app?canceled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[billing/checkout] failed:', err.message)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}
