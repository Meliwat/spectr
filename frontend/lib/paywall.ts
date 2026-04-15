import { getEnv } from '@/lib/env'

/**
 * Master feature flag for the paywall. `true` activates:
 *  - Two-CTA UI on /app (paid + free sample)
 *  - Credit check + consume in POST /api/projects (auto mode)
 *
 * When `false`, /app behaves as it did before the paywall existed: a single
 * upload UI that fires the worker on every submit. Free-sample CTA is hidden.
 *
 * Read in both server (route handlers, Server Components) and client
 * (Client Components) — the NEXT_PUBLIC_ prefix exposes it to the bundle.
 */
export function paywallEnabled(): boolean {
  return getEnv('NEXT_PUBLIC_PAYWALL_ENABLED') === 'true'
}
