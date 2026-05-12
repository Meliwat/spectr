'use client'

import { useState } from 'react'

export default function CopyableCommand({ value, label = 'Install' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(value)
      ok = true
    } catch {
      // Fallback for non-secure contexts, sandboxed iframes, and older browsers
      try {
        const ta = document.createElement('textarea')
        ta.value = value
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        ta.style.pointerEvents = 'none'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        ok = false
      }
    }
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="mcp-cmd" role="group" aria-label={`${label} command`}>
      <span className="mcp-cmd-label">{label}</span>
      <pre className="mcp-cmd-text"><code>{value}</code></pre>
      <button
        type="button"
        onClick={copy}
        className="mcp-cmd-copy"
        aria-live="polite"
        aria-label={copied ? 'Copied to clipboard' : 'Copy install command'}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 11V3.5C3 2.67 3.67 2 4.5 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  )
}
