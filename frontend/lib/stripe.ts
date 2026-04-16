import Stripe from 'stripe'
import { getEnv } from '@/lib/env'

/**
 * Stripe SDK instance, server-side only. Reads STRIPE_SECRET_KEY at call time
 * so missing-env errors surface in route handlers (where they're catchable)
 * rather than at module load.
 */
export function getStripe(): Stripe {
  const key = getEnv('STRIPE_SECRET_KEY')
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(key, { apiVersion: '2024-06-20' })
}
