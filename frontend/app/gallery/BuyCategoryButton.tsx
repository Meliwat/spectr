'use client'

import { useCallback, useEffect, useState } from 'react'

// Gallery is free. Hardcoded to keep it that way independent of env state.
const PAYWALL_ENABLED = false

type AppFiles = { slug: string; name: string; files: { name: string; url: string }[] }

/**
 * Buy + deliver every app's spec in one gallery category (the bundle).
 *
 *  - Click → /api/gallery/category-checkout → Stripe (the $4 bundle price).
 *    On success Stripe returns to this page with ?purchased=cat&session_id=.
 *  - On that redirect (and from the webhook's emailed link) this fetches
 *    every app's signed download links and renders them grouped by app.
 *  - Paywall disabled (local dev) → pulls straight from the bucket.
 *
 * Reacts only to ?purchased=cat so it never collides with BuySpecButton
 * (?purchased=1) on the same page.
 */
export default function BuyCategoryButton({
  category,
  categoryLabel,
  count,
  className,
  children,
}: {
  category: string
  categoryLabel: string
  count: number
  className?: string
  children?: React.ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apps, setApps] = useState<AppFiles[] | null>(null)
  const [emailed, setEmailed] = useState(false)
  const [zipHref, setZipHref] = useState<string | null>(null)

  const loadBundle = useCallback(async (url: string, viaPurchase: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(json?.apps) || json.apps.length === 0) {
        setError(
          viaPurchase
            ? 'Payment went through but the download link failed — check your email, or contact hello@spectr.to.'
            : json?.error || 'Could not load the bundle.',
        )
        return
      }
      setApps(json.apps)
      setEmailed(viaPurchase)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchased') === 'cat' && params.get('session_id')) {
      const sid = params.get('session_id')!
      setZipHref(`/api/gallery/spec-zip?session_id=${encodeURIComponent(sid)}`)
      void loadBundle(
        `/api/gallery/spec-download?session_id=${encodeURIComponent(sid)}`,
        true,
      )
      const url = new URL(window.location.href)
      url.searchParams.delete('purchased')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  }, [loadBundle])

  const handleClick = useCallback(async () => {
    setError(null)
    if (!PAYWALL_ENABLED) {
      setZipHref(`/api/gallery/spec-zip?category=${encodeURIComponent(category)}`)
      void loadBundle(`/api/gallery/spec-download?category=${encodeURIComponent(category)}`, false)
      return
    }
    setBusy(true)
    try {
      const returnPath =
        typeof window !== 'undefined' ? window.location.pathname : `/gallery/${category}`
      const res = await fetch('/api/gallery/category-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, returnPath }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.checkoutUrl) {
        setError(
          json?.error === 'unknown_category'
            ? 'This category is unavailable.'
            : 'Could not start checkout.',
        )
        setBusy(false)
        return
      }
      window.location.href = json.checkoutUrl
    } catch {
      setError('Network error — please try again.')
      setBusy(false)
    }
  }, [category, loadBundle])

  if (apps && zipHref) {
    return (
      <div className="bc-files">
        <style dangerouslySetInnerHTML={{ __html: `
          .bc-files {
            border: 1px solid rgba(168,139,255,0.35);
            background: rgba(168,139,255,0.06);
            border-radius: 12px;
            padding: 20px 22px;
            margin-bottom: 28px;
          }
          .bc-files h4 { margin: 0 0 4px; font-size: 15px; color: #f3f4fb; font-weight: 560; }
          .bc-sub { margin: 0 0 16px; font-size: 13px; color: rgba(208,214,228,0.7); }
          .bc-zip {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 13px 24px; border-radius: 10px;
            background: linear-gradient(135deg, #7a6cff 0%, #a88bff 100%);
            color: #0a0b14; font-weight: 600; font-size: 14px;
            text-decoration: none; border: 0;
            box-shadow: 0 8px 24px rgba(113,112,255,0.35);
          }
          .bc-zip:hover { transform: translateY(-1px); }
        `}} />
        <h4>You own all {apps.length} {categoryLabel} specs ✓</h4>
        <p className="bc-sub">
          {emailed
            ? 'Also sent to your email. One zip with every app’s DESIGN.md pack (re-open the email link any time):'
            : 'One zip with every app’s DESIGN.md pack:'}
        </p>
        <a className="bc-zip" href={zipHref} download>
          ↓ Download all {apps.length} {categoryLabel} specs (.zip)
        </a>
      </div>
    )
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick} disabled={busy}>
        {busy ? 'Working…' : (children ?? `Get all ${categoryLabel} app specs (${count})`)}
      </button>
      {error ? (
        <p style={{ fontSize: 12, color: '#ffb8b8', margin: '8px 0 0' }}>{error}</p>
      ) : null}
    </>
  )
}
