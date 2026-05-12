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
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 7.5h6M5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'cli',
    label: 'CLI',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 5l3 3-3 3M7 11h7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'skill',
    label: 'Skill',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 3h6l2.5 2.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M10 3v2.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
]

type Step = {
  title: string
  body: React.ReactNode
  command?: string
}

const MCP_STEPS: Step[] = [
  {
    title: 'Add Spectr to Claude Code',
    body: (
      <>
        One command. Works in Claude Code, Cursor, Codex, or any MCP-capable client.
      </>
    ),
    command: 'claude mcp add spectr -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp',
  },
  {
    title: 'Point at any iOS app',
    body: (
      <>
        Drop an App Store URL into the conversation. Spectr scrapes the screenshots Apple
        already publishes and runs vision analysis.
      </>
    ),
    command: 'Generate a spec from apps.apple.com/us/app/duolingo/id570060128',
  },
  {
    title: 'Read the spec.md',
    body: (
      <>
        2–10 minutes later, a 7-section markdown spec lands on disk. Exact hex codes,
        exact font weights, every screen state.
      </>
    ),
  },
]

const CLI_STEPS: Step[] = [
  {
    title: 'Install ffmpeg + clone',
    body: 'Frame extraction needs ffmpeg. The repo ships the extract.py tool used by the rest of Spectr.',
    command: 'brew install ffmpeg && git clone https://github.com/Meliwat/spectr ~/spectr',
  },
  {
    title: 'Extract unique frames',
    body: (
      <>
        Feed it any MP4 — phone mirror, simulator capture, desktop recording.
        Scene-change detection + perceptual hashing dedupes to a clean set.
      </>
    ),
    command: 'python ~/spectr/worker/extract.py --mp4 ./rec.mp4 --app "Duolingo"',
  },
  {
    title: 'Hand the frames off',
    body: (
      <>
        Drag the resulting <code>frames/</code> folder into Claude Code and invoke{' '}
        <code>/spectr</code>. Or pipe the output into your own pipeline.
      </>
    ),
  },
]

const SKILL_STEPS: Step[] = [
  {
    title: 'Install Claude Code',
    body: (
      <>
        The skill runs inside Claude Code. The MCP install bundles it into{' '}
        <code>~/.claude/skills/spectr/</code> automatically.
      </>
    ),
  },
  {
    title: 'Drop frames into chat',
    body: 'Any folder of iOS-shaped screen frames works — extract.py output, screenshots from your phone, design comps, anything vertical.',
  },
  {
    title: 'Invoke the skill',
    body: 'Claude Code calls into the skill, runs the same vision passes, writes spec.md to disk.',
    command: '/spectr',
  },
]

const STEPS_BY_TAB: Record<TabKey, Step[]> = {
  mcp: MCP_STEPS,
  cli: CLI_STEPS,
  skill: SKILL_STEPS,
}

function ClaudeMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1 L13.3 10.4 L22.6 12 L13.3 13.6 L12 23 L10.7 13.6 L1.4 12 L10.7 10.4 Z"
        fill="#D97757"
      />
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

        <div className="mcp-agents" aria-label="Supported AI agents">
          <span className="mcp-agent is-primary">
            <ClaudeMark />
            <span>Claude</span>
          </span>
          <span className="mcp-agent">
            <span className="mcp-agent-dot" aria-hidden="true" />
            <span>Cursor</span>
          </span>
          <span className="mcp-agent">
            <span className="mcp-agent-dot" aria-hidden="true" />
            <span>Codex</span>
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
              <span className="mcp-step-card-num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mcp-step-card-title">{step.title}</h3>
              <p className="mcp-step-card-body">{step.body}</p>
              {step.command ? (
                <CopyableCommand value={step.command} label="Copy" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
