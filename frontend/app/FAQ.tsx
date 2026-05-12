'use client'

import { useState } from 'react'

type QA = { q: string; a: React.ReactNode }

const FAQS: QA[] = [
  {
    q: 'Do I need an Anthropic API key?',
    a: (
      <>
        No — if you have Claude Code installed and logged in. The MCP shells out to the{' '}
        <code>claude</code> CLI by default, so vision and spec generation bill against your
        existing Claude Pro / Max subscription. Set <code>ANTHROPIC_API_KEY</code> only if you
        prefer to pay Anthropic by token instead, or if you're using a non-Claude-Code MCP host
        without the CLI installed.
      </>
    ),
  },
  {
    q: 'How long does a spec take to generate?',
    a: (
      <>
        Typically <strong>2–5 minutes for App Store URLs</strong> (5–10 screenshots) and{' '}
        <strong>5–10 minutes for MP4 recordings</strong> (up to 20 deduped frames at the default
        cap). Larger <code>max_frames</code> values scale roughly linearly.
      </>
    ),
  },
  {
    q: 'What does a spec.md actually contain?',
    a: (
      <>
        Seven structured sections, ~80–150 KB of markdown total: app overview, navigation
        architecture, screen-by-screen specs, component library, design system with exact
        hex/px/weight values, implementation notes, and a Claude Code prompt the developer
        can paste to build the clone. Targets Expo SDK 54 / React Native / iPhone 15 baseline.
      </>
    ),
  },
  {
    q: 'Do my recordings leave my machine?',
    a: (
      <>
        No. The MCP runs entirely locally. Screen recordings stay on your laptop. The only
        outbound calls are to Anthropic (for vision and text inference) and Apple's App Store CDN
        (when you hand it an App Store URL — Apple sees a screenshot fetch, not your local file).
      </>
    ),
  },
  {
    q: 'Will it work with Cursor or Codex?',
    a: (
      <>
        Yes. Any MCP-compatible client works — Cursor and Codex both spawn MCP subprocesses
        the same way Claude Code does. The catch: Cursor users without the <code>claude</code> CLI
        installed will need an <code>ANTHROPIC_API_KEY</code> in their env, since there's no
        subscription auth to fall back on.
      </>
    ),
  },
  {
    q: 'What apps can I generate specs for?',
    a: (
      <>
        Any iOS app on the App Store (via URL — Spectr scrapes the preview screenshots Apple
        publishes), or anything you can screen-record on your phone or simulator (via MP4 input).
        Android-only apps work fine with MP4 input. The spec output targets iOS / Expo /
        React Native, so the vocabulary is iOS-flavored even when the input is cross-platform.
      </>
    ),
  },
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <ul className="mcp-faq">
      {FAQS.map((item, i) => {
        const isOpen = openIdx === i
        return (
          <li key={i} className={`mcp-faq-item ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="mcp-faq-q"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              id={`faq-q-${i}`}
              onClick={() => setOpenIdx(isOpen ? null : i)}
            >
              <span className="mcp-faq-q-text">{item.q}</span>
              <span className="mcp-faq-q-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 6.5L8 10.5L12 6.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            <div
              role="region"
              id={`faq-panel-${i}`}
              aria-labelledby={`faq-q-${i}`}
              className="mcp-faq-a"
              hidden={!isOpen}
            >
              <p>{item.a}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
