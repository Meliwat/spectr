'use client'
import { useState } from 'react'

export default function SpecPreview({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510, letterSpacing: '-0.165px' }}>Preview</p>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs"
          style={{ color: 'var(--muted)', fontWeight: 510 }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div
        className="mono text-xs leading-relaxed overflow-auto p-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          color: 'var(--muted)',
          whiteSpace: 'pre-wrap',
          maxHeight: expanded ? '80vh' : '300px',
        }}
      >
        {expanded ? content : content.slice(0, 1500)}
        {!expanded && <span style={{ color: 'var(--subdued)' }}>...</span>}
      </div>
    </div>
  )
}
