'use client'
import { useEffect, useState } from 'react'
import { paywallEnabled } from '@/lib/paywall'

interface Props {
  open: boolean
  onClose: () => void
  onFreeDemo: () => void
  onPaid: () => void
  busy: boolean
  error: string | null
}

export default function BillingCTA({ open, onClose, onFreeDemo, onPaid, busy, error }: Props) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="panel-strong p-6 sm:p-8"
        style={{ maxWidth: 540, width: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl" style={{ fontWeight: 510 }}>
          How would you like your blueprint?
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2" style={{ alignItems: 'stretch' }}>
          <div
            className="flex flex-col rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg" style={{ fontWeight: 510 }}>Full spec — $19</h3>
            <p className="mt-2 flex-1 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
              Automatic processing. Your complete blueprint is ready in about three minutes.
            </p>
            <button
              onClick={onPaid}
              disabled={busy}
              className="mt-4 w-full rounded-md px-4 py-2 text-sm"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 500 }}
            >
              {busy ? 'Processing…' : 'Pay & generate'}
            </button>
          </div>

          <div
            className="flex flex-col rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg" style={{ fontWeight: 510 }}>Free demo</h3>
            <p className="mt-2 flex-1 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
              Sample preview only — not a full spec. We review your video and email a demo within 24 hours.
            </p>
            <button
              onClick={onFreeDemo}
              disabled={busy}
              className="mt-4 w-full rounded-md px-4 py-2 text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 500 }}
            >
              {busy ? 'Processing…' : 'Get free demo'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-sm"
          style={{ color: 'var(--muted)', padding: '8px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
