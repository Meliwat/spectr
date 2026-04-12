'use client'
import { useState } from 'react'

interface Props {
  onColors: (c: Record<string, string> | null) => void
  onBundleId?: (s: string) => void
  bundlePlaceholder?: string
  showBundleId?: boolean
}

const DEFAULT_COLORS = {
  primary: '#5e6ad2',
  secondary: '#191a1b',
  background: '#08090a',
  text: '#f7f8f8',
}

export default function BrandingForm({
  onColors,
  onBundleId,
  bundlePlaceholder = '',
  showBundleId = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [colors, setColors] = useState(DEFAULT_COLORS)

  function updateColor(key: string, val: string) {
    const updated = { ...colors, [key]: val }
    setColors(updated)
    onColors(updated)
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn"
        style={{ paddingInline: 14 }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            color: 'var(--subdued)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.25 8.25 6 4.5 9.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Add your brand
      </button>

      {open && (
        <div
          className="panel mt-4 space-y-6 p-5"
          style={{
            borderRadius: 16,
          }}
          >
          <div>
            <p className="section-title">Color direction</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(colors).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl px-3 py-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}
                >
                  <input
                    type="color"
                    value={val}
                    onChange={e => updateColor(key, e.target.value)}
                    className="w-7 h-7 cursor-pointer border-0 p-0"
                    style={{ borderRadius: 4, background: 'none' }}
                  />
                  <div>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-2)', fontWeight: 510 }}>{key}</p>
                    <p className="mono text-xs" style={{ color: 'var(--subdued)' }}>{val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showBundleId && onBundleId && (
            <div>
              <label className="field-label">Bundle ID</label>
              <input
                type="text"
                placeholder={bundlePlaceholder}
                onChange={e => onBundleId(e.target.value)}
                className="input text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
