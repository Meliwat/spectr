import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return new NextResponse('Missing stripe-signature', { status: 400 })
  }

  const secret = getEnv('STRIPE_WEBHOOK_SECRET')
  if (!secret) {
    console.error('[billing/webhook] STRIPE_WEBHOOK_SECRET not set')
    return new NextResponse('Misconfigured', { status: 500 })
  }

  const body = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    console.error('[billing/webhook] signature check failed:', err.message)
    return new NextResponse('Bad signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id
    if (!userId) {
      console.error('[billing/webhook] no client_reference_id on session', session.id)
      return new NextResponse('No user id', { status: 400 })
    }

    const admin = makeSupabaseServer()
    const { error } = await admin
      .from('spec_credits')
      .upsert(
        {
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_id: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          amount_cents: session.amount_total,
          status: 'available',
          source: 'stripe',
        },
        { onConflict: 'stripe_session_id' },
      )

    if (error) {
      console.error('[billing/webhook] db write failed:', error.message)
      // Return 500 so Stripe retries (up to 3 days).
      return new NextResponse('db error', { status: 500 })
    }

    console.log('[billing/webhook] credit issued for user', userId, 'session', session.id)
  }

  // Future: handle 'charge.refunded' to flip credits back to 'refunded'.

  return new NextResponse('ok', { status: 200 })
}
