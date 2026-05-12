'use client'

import { useState } from 'react'
import CopyableCommand from './CopyableCommand'

type TabKey = 'mcp' | 'cli' | 'skill'

interface InstallTabsProps {
  defaultTab?: TabKey
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'mcp',
    label: 'MCP',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 7.5h6M5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'cli',
    label: 'CLI',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 5l3 3-3 3M7 11h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'skill',
    label: 'Skill',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 3h6l2.5 2.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M10 3v2.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
]

type Step = {
  title: string
  body: React.ReactNode
  command?: string
  link?: { label: string; href: string }
}

const MCP_STEPS: Step[] = [
  {
    title: 'Add Spectr to Claude Code',
    body: (
      <>
        One command. Runs on <strong>your Claude subscription</strong> via the{' '}
        <code>claude</code> CLI — no API key needed.
      </>
    ),
    command: 'claude mcp add spectr -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp',
  },
  {
    title: 'Ask Claude for a spec',
    body: 'Drop any App Store URL into the conversation. Spectr scrapes Apple’s preview screenshots and runs vision analysis through your Claude session.',
    command: 'Generate a spec from apps.apple.com/us/app/duolingo/id570060128',
  },
  {
    title: 'Read the spec.md',
    body: '2–10 minutes later, a 7-section markdown spec lands on disk. Exact hex codes, exact font weights, every screen state.',
  },
]

const CLI_STEPS: Step[] = [
  {
    title: 'Install the CLI',
    body: (
      <>
        One command. Runs locally on <strong>your Claude subscription</strong> via the{' '}
        <code>claude</code> CLI — no API key needed.
      </>
    ),
    command: 'npm install -g @spectr/cli',
  },
  {
    title: 'Point at any iOS app',
    body: 'Pass an App Store URL or a local MP4 screen recording. Vision runs through your Claude session.',
    command: 'spectr generate <app-store-url>',
  },
  {
    title: 'Read the spec.md',
    body: '2–10 minutes later, a 7-section markdown spec lands in your working directory. Exact tokens, every screen state.',
  },
]

const SKILL_STEPS: Step[] = [
  {
    title: 'Add the Spectr skill',
    body: (
      <>
        Drops <code>SKILL.md</code> into <code>~/.claude/skills/spectr/</code>. Runs inside
        Claude Code on <strong>your Claude subscription</strong> — no API key needed.
      </>
    ),
    command: 'npx skills add spectr-ai/skills',
  },
  {
    title: 'Drop frames into chat',
    body: 'A folder of pre-extracted iOS frames, screenshots from your phone, design comps — anything vertical and iOS-shaped.',
  },
  {
    title: 'Invoke the skill',
    body: 'Claude Code calls the skill, runs vision passes, writes spec.md to disk in your project.',
    command: '/spectr',
  },
]

const STEPS_BY_TAB: Record<TabKey, Step[]> = { mcp: MCP_STEPS, cli: CLI_STEPS, skill: SKILL_STEPS }

function ClaudeMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#D97757">
        <ellipse cx="12" cy="12" rx="1.5" ry="10.5" />
        <ellipse cx="12" cy="12" rx="1.5" ry="10.5" transform="rotate(45 12 12)" />
        <ellipse cx="12" cy="12" rx="1.5" ry="10.5" transform="rotate(90 12 12)" />
        <ellipse cx="12" cy="12" rx="1.5" ry="10.5" transform="rotate(135 12 12)" />
      </g>
    </svg>
  )
}

export default function InstallTabs({ defaultTab = 'mcp' }: InstallTabsProps) {
  const [tab, setTab] = useState<TabKey>(defaultTab)
  const steps = STEPS_BY_TAB[tab]

  return (
    <div className="mcp-tabs-wrap">
      <div className="mcp-tabs-header">
        <div role="tablist" aria-label="Install method" className="mcp-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`mcp-tab-panel-${t.key}`}
              id={`mcp-tab-${t.key}`}
              type="button"
              className={`mcp-tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="mcp-tab-icon">{t.icon}</span>
              <span className="mcp-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mcp-agents" aria-label="Supported AI agent">
          <span className="mcp-agent is-primary">
            <ClaudeMark />
            <span>Claude</span>
          </span>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`mcp-tab-panel-${tab}`}
        aria-labelledby={`mcp-tab-${tab}`}
        className="mcp-tab-panel"
        key={tab}
      >
        <ol className="mcp-steps-row">
          {steps.map((step, i) => (
            <li key={i} className="mcp-step-card">
              <div className="mcp-step-card-head">
                <span className="mcp-step-card-num">{i + 1}</span>
                <h3 className="mcp-step-card-title">{step.title}</h3>
              </div>
              <p className="mcp-step-card-body">{step.body}</p>
              {step.command ? (
                <CopyableCommand value={step.command} label="Copy" />
              ) : null}
              {step.link ? (
                <a
                  className="mcp-step-link"
                  href={step.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {step.link.label}
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M5 3h8v8M13 3L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
