'use client'

import { useCallback, useEffect, useState } from 'react'
import GenerateSpecModal from './GenerateSpecModal'

export default function GenerateSpecButton({
  defaultReferenceApp,
  className,
  children,
}: {
  defaultReferenceApp?: string
  className?: string
  children?: React.ReactNode
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If Stripe redirected us back with ?paid=1&session_id=..., open the modal
  // in post-payment mode so the user can finish picking their input.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session_id')
    const paid = params.get('paid')
    if (paid === '1' && sid) {
      setPaidSessionId(sid)
      setModalOpen(true)
    }
  }, [])

  // Direct-to-Stripe on click — no email prompt. Stripe collects email natively.
  const startCheckout = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const returnPath =
        typeof window !== 'undefined' ? window.location.pathname : '/'
      const res = await fetch('/api/gallery/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.checkoutUrl) {
        setError(json?.error || 'Could not start checkout.')
        setBusy(false)
        return
      }
      window.location.href = json.checkoutUrl
    } catch {
      setError('Network error — please try again.')
      setBusy(false)
    }
  }, [])

  const handleClose = () => {
    setModalOpen(false)
    // Once the post-payment modal is closed, clear the URL params so a refresh
    // doesn't reopen the same state.
    if (paidSessionId && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('paid')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={startCheckout}
        disabled={busy}
      >
        {busy ? 'Starting checkout…' : (children ?? 'Generate your own spec ↗')}
      </button>
      {error ? (
        <p style={{ fontSize: 12, color: '#ffb8b8', margin: '8px 0 0' }}>
          {error}
        </p>
      ) : null}
      <GenerateSpecModal
        open={modalOpen}
        onClose={handleClose}
        defaultReferenceApp={defaultReferenceApp}
        paidSessionId={paidSessionId}
      />
    </>
  )
}
