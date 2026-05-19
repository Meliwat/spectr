'use client'

import { useCallback, useEffect, useState } from 'react'

const PAYWALL_ENABLED =
  (process.env.NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED ?? '').replace(/\n/g, '').trim() === 'true'

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
      void loadBundle(
        `/api/gallery/spec-download?session_id=${encodeURIComponent(params.get('session_id')!)}`,
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

  if (apps) {
    return (
      <div className="bc-files">
        <style dangerouslySetInnerHTML={{ __html: `
          .bc-files {
            border: 1px solid rgba(168,139,255,0.35);
            background: rgba(168,139,255,0.06);
            border-radius: 12px;
            padding: 18px 20px;
            margin-bottom: 28px;
          }
          .bc-files h4 { margin: 0 0 4px; font-size: 15px; color: #f3f4fb; font-weight: 560; }
          .bc-sub { margin: 0 0 16px; font-size: 13px; color: rgba(208,214,228,0.7); }
          .bc-app { margin: 0 0 14px; }
          .bc-app-name {
            font-size: 12px; font-weight: 600; color: #cbd0ee;
            letter-spacing: 0.02em; margin: 0 0 6px;
          }
          .bc-dl {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 7px 13px; border-radius: 8px; margin: 0 6px 6px 0;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.12);
            color: #e8ebff; font-size: 12px; text-decoration: none;
            font-family: monospace;
          }
          .bc-dl:hover { background: rgba(255,255,255,0.09); }
        `}} />
        <h4>You own all {apps.length} {categoryLabel} specs ✓</h4>
        <p className="bc-sub">
          {emailed
            ? 'Also sent to your email. All downloads below (links valid for 1 hour — reopen the email link any time for fresh ones):'
            : 'All downloads below (valid for 1 hour):'}
        </p>
        {apps.map((a) => (
          <div key={a.slug} className="bc-app">
            <p className="bc-app-name">{a.name}</p>
            {a.files.map((f) => (
              <a key={f.name} className="bc-dl" href={f.url} download>
                ↓ {f.name}
              </a>
            ))}
          </div>
        ))}
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
