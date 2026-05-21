'use client'

import { useCallback, useEffect, useState } from 'react'

// Gallery is free. Hardcoded to keep it that way independent of env state.
const PAYWALL_ENABLED = false

type SpecFile = { name: string; url: string }

/**
 * Buy + deliver one app's spec pack.
 *
 *  - Click → Stripe Checkout (reuses the gallery price). On success Stripe
 *    redirects back with ?purchased=1&session_id=... and the billing webhook
 *    emails the .md files.
 *  - On that redirect this also fetches signed download links so the buyer
 *    gets the files immediately even if the email lands in spam.
 *  - When the paywall is disabled (local dev) the click skips Stripe and
 *    pulls the files straight from the bucket — same escape hatch the
 *    generate-your-own button uses.
 */
export default function BuySpecButton({
  slug,
  appName,
  className,
  children,
}: {
  slug: string
  appName: string
  className?: string
  children?: React.ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<SpecFile[] | null>(null)
  const [emailed, setEmailed] = useState(false)

  const loadFiles = useCallback(async (url: string, viaPurchase: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      const appFiles = Array.isArray(json?.apps) ? json.apps[0]?.files : null
      if (!res.ok || !Array.isArray(appFiles) || appFiles.length === 0) {
        setError(
          viaPurchase
            ? 'Payment went through but the download link failed — check your email, or contact hello@spectr.to.'
            : json?.error || 'Could not load the spec.',
        )
        return
      }
      setFiles(appFiles)
      setEmailed(viaPurchase)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  // Stripe redirected back after payment — fetch the signed download links.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchased') === '1' && params.get('session_id')) {
      void loadFiles(
        `/api/gallery/spec-download?session_id=${encodeURIComponent(params.get('session_id')!)}`,
        true,
      )
      const url = new URL(window.location.href)
      url.searchParams.delete('purchased')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  }, [loadFiles])

  const handleClick = useCallback(async () => {
    setError(null)
    if (!PAYWALL_ENABLED) {
      void loadFiles(`/api/gallery/spec-download?slug=${encodeURIComponent(slug)}`, false)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/gallery/spec-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.checkoutUrl) {
        setError(json?.error === 'unknown_app' ? 'This app is unavailable.' : 'Could not start checkout.')
        setBusy(false)
        return
      }
      window.location.href = json.checkoutUrl
    } catch {
      setError('Network error — please try again.')
      setBusy(false)
    }
  }, [slug, loadFiles])

  if (files) {
    return (
      <div className="bs-files">
        <style dangerouslySetInnerHTML={{ __html: `
          .bs-files {
            border: 1px solid rgba(168,139,255,0.35);
            background: rgba(168,139,255,0.06);
            border-radius: 12px;
            padding: 18px 20px;
            margin-bottom: 28px;
          }
          .bs-files h4 {
            margin: 0 0 4px; font-size: 15px; color: #f3f4fb; font-weight: 560;
          }
          .bs-files .bs-sub {
            margin: 0 0 14px; font-size: 13px; color: rgba(208,214,228,0.7);
          }
          .bs-dl {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 9px 16px; border-radius: 9px; margin: 0 8px 8px 0;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.12);
            color: #e8ebff; font-size: 13px; text-decoration: none;
            font-family: monospace;
          }
          .bs-dl:hover { background: rgba(255,255,255,0.09); }
        `}} />
        <h4>You own the {appName} spec ✓</h4>
        <p className="bs-sub">
          {emailed
            ? 'Also sent to your email. Download links below (valid for 1 hour):'
            : 'Download links (valid for 1 hour):'}
        </p>
        {files.map((f) => (
          <a key={f.name} className="bs-dl" href={f.url} download>
            ↓ {f.name}
          </a>
        ))}
      </div>
    )
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick} disabled={busy}>
        {busy ? 'Working…' : (children ?? `Get full ${appName} spec`)}
      </button>
      {error ? (
        <p style={{ fontSize: 12, color: '#ffb8b8', margin: '8px 0 0' }}>{error}</p>
      ) : null}
    </>
  )
}
