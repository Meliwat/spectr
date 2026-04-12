'use client'
import { useState } from 'react'

export default function SpecPreview({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510, letterSpacing: '-0.165px' }}>Peek inside</p>
        <button
          onClick={() => setExpanded(e => !e)}
          className="btn"
          style={{ padding: '8px 12px', fontSize: 12 }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      </div>
      <div
        className="mono spec-code text-xs leading-relaxed overflow-auto p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          color: 'var(--muted)',
          maxHeight: expanded ? '80vh' : '300px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {expanded ? content : content.slice(0, 1500)}
        {!expanded && <span style={{ color: 'var(--subdued)' }}>...</span>}
      </div>
    </div>
  )
}
