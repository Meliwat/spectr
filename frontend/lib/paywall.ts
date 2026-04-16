/**
 * Master feature flag for the paywall. `true` activates:
 *  - Two-CTA UI on /app (paid + free sample)
 *  - Credit check + consume in POST /api/projects (auto mode)
 *
 * When `false`, /app behaves as it did before the paywall existed: a single
 * upload UI that fires the worker on every submit. Free-sample CTA is hidden.
 *
 * Uses literal `process.env.NEXT_PUBLIC_PAYWALL_ENABLED` access so Next.js
 * inlines the value at build time — required for client-side reads (the
 * variable-key trick in lib/env.ts prevents inlining, which breaks in the
 * browser where process.env doesn't exist at runtime).
 */
export function paywallEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PAYWALL_ENABLED ?? ''
  return raw.replace(/\n/g, '').trim() === 'true'
}
