'use client'
import { useState } from 'react'

interface Props {
  onColors: (c: Record<string, string>) => void
  onLogo: (f: File | null) => void
  onBundleId: (s: string) => void
}

const DEFAULT_COLORS = {
  primary: '#5e6ad2',
  secondary: '#191a1b',
  background: '#08090a',
  text: '#f7f8f8',
}

export default function BrandingForm({ onColors, onLogo, onBundleId }: Props) {
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
        className="text-sm flex items-center gap-2"
        style={{ color: 'var(--muted)', fontWeight: 510 }}
      >
        <span style={{ fontSize: 9, color: 'var(--subdued)' }}>{open ? '▼' : '▶'}</span>
        Branding (optional)
      </button>

      {open && (
        <div
          className="mt-4 space-y-6 p-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        >
          <div>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)', fontWeight: 510 }}>Brand colors</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(colors).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
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

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--muted)', fontWeight: 510 }}>Logo (PNG or SVG)</label>
            <input
              type="file"
              accept="image/png,image/svg+xml"
              onChange={e => onLogo(e.target.files?.[0] || null)}
              className="text-xs w-full"
              style={{ color: 'var(--muted)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--muted)', fontWeight: 510 }}>Bundle ID</label>
            <input
              type="text"
              placeholder="com.yourco.appname"
              onChange={e => onBundleId(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
