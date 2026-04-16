'use client'
import { useEffect, useState } from 'react'
import { paywallEnabled } from '@/lib/paywall'

type Mode = 'auto' | 'sample'

interface Props {
  /**
   * Renders the upload UI. Receives the chosen mode so the upload form can
   * include it in the POST body.
   */
  renderUploader: (args: { mode: Mode }) => React.ReactNode
}

export default function BillingCTA({ renderUploader }: Props) {
  const enabled = paywallEnabled()
  const [credits, setCredits] = useState<number | null>(enabled ? null : 0)
  const [chosenMode, setChosenMode] = useState<Mode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Bypass: paywall off → render the existing uploader as today ───────
  if (!enabled) {
    return <>{renderUploader({ mode: 'auto' })}</>
  }

  // ─── Initial credit fetch ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    fetch('/api/billing/credits')
      .then((r) => (r.ok ? r.json() : { available: 0 }))
      .then((data) => { if (!cancelled) setCredits(data.available ?? 0) })
      .catch(() => { if (!cancelled) setCredits(0) })
    return () => { cancelled = true }
  }, [])

  // ─── Post-Stripe redirect: poll for credit to appear ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchased') !== '1') return

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const r = await fetch('/api/billing/credits')
        const data = await r.json()
        if ((data.available ?? 0) > 0) {
          clearInterval(interval)
          setCredits(data.available)
          window.history.replaceState({}, '', '/app')
        } else if (attempts >= 10) {
          clearInterval(interval)
          setError('Payment is processing — refresh in a moment.')
        }
      } catch {
        // Continue polling.
      }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // ─── Loading state ─────────────────────────────────────────────────────
  if (credits === null) {
    return <div className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }

  // ─── Has credits OR user picked a mode → show uploader ─────────────────
  if (credits > 0) {
    return <>{renderUploader({ mode: 'auto' })}</>
  }
  if (chosenMode === 'sample') {
    return <>{renderUploader({ mode: 'sample' })}</>
  }

  // ─── No credits, no choice yet → show two-CTA chooser ──────────────────
  async function startCheckout() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/billing/checkout', { method: 'POST' })
      if (!r.ok) {
        const text = await r.text()
        throw new Error(text || `HTTP ${r.status}`)
      }
      const { url } = await r.json()
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      setError(err.message ?? 'Checkout failed')
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="panel-strong p-6">
        <h3 className="text-xl" style={{ fontWeight: 510 }}>Generate now — $19</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Automatic processing. Your spec is ready in about three minutes.
        </p>
        <button
          onClick={startCheckout}
          disabled={busy}
          className="mt-4 w-full rounded-md px-4 py-2 text-sm"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 500 }}
        >
          {busy ? 'Redirecting…' : 'Pay & upload'}
        </button>
      </div>

      <div className="panel-strong p-6">
        <h3 className="text-xl" style={{ fontWeight: 510 }}>Free sample</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          We review your video by hand and email your spec within 24 hours.
        </p>
        <button
          onClick={() => setChosenMode('sample')}
          className="mt-4 w-full rounded-md px-4 py-2 text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 500 }}
        >
          Upload for free sample
        </button>
      </div>

      {error && (
        <div className="sm:col-span-2 text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
