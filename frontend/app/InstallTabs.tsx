'use client'

import { useState } from 'react'
import CopyableCommand from './CopyableCommand'

type TabKey = 'mcp' | 'cli' | 'skill'

interface InstallTabsProps {
  defaultTab?: TabKey
}

const TABS: { key: TabKey; label: string; sublabel: string }[] = [
  { key: 'mcp', label: 'MCP', sublabel: 'one command' },
  { key: 'cli', label: 'CLI', sublabel: 'script it' },
  { key: 'skill', label: 'Skill', sublabel: 'inside Claude Code' },
]

type Step = {
  title: string
  body: React.ReactNode
  command?: string
  commandLabel?: string
}

const MCP_STEPS: Step[] = [
  {
    title: 'Install the MCP',
    body: 'One command. Adds Spectr to Claude Code, Cursor, Codex, or any MCP-capable client. No API key needed if you have a Claude subscription.',
    command: 'claude mcp add spectr -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp',
    commandLabel: 'Run in your shell',
  },
  {
    title: 'Point at any iOS app',
    body: (
      <>
        Drop an App Store URL into your AI agent and ask it to generate a spec. The MCP scrapes
        screenshots from the App Store CDN — no MP4 needed for most cases.
      </>
    ),
    command: '> Generate a spec from https://apps.apple.com/us/app/duolingo/id570060128',
    commandLabel: 'Ask your AI agent',
  },
  {
    title: 'Get spec.md back',
    body: (
      <>
        A 7-section markdown spec lands on disk in 2–10 minutes: app overview, navigation
        architecture, screen-by-screen specs, design system with <em>exact</em> hex/px/weight values,
        components, implementation notes, and a Claude Code prompt to build the clone.
      </>
    ),
  },
]

const CLI_STEPS: Step[] = [
  {
    title: 'Install ffmpeg + clone the repo',
    body: 'The CLI extracts unique frames from a screen recording using ffmpeg scene-change detection and perceptual hashing. Faster than 1fps extraction and skips dead-time.',
    command: 'brew install ffmpeg\ngit clone https://github.com/Meliwat/spectr ~/spectr\ncd ~/spectr/worker && pip install -r requirements.txt',
    commandLabel: 'Run in your shell',
  },
  {
    title: 'Extract frames from any recording',
    body: (
      <>
        Hand it an MP4 of your screen recording — phone mirroring, simulator capture, anything.
        Outputs a deduped <code>frames/</code> folder and a <code>.spectr_meta</code> sidecar
        with all the metadata your AI agent needs.
      </>
    ),
    command: 'python ~/spectr/worker/extract.py \\\n  --mp4 ~/Desktop/recording.mp4 \\\n  --app "Duolingo" \\\n  --max-frames 20',
    commandLabel: 'Extract',
  },
  {
    title: 'Hand the frames to your AI agent',
    body: (
      <>
        Drag the resulting <code>spectr_duolingo/frames/</code> folder into Claude Code (or any
        agent), then invoke the <code>/spectr</code> skill below to generate the spec from those
        frames. Scriptable: pipe the output of extract.py straight into your own pipeline.
      </>
    ),
  },
]

const SKILL_STEPS: Step[] = [
  {
    title: 'Drop frames into your conversation',
    body: (
      <>
        Drag a folder of pre-extracted screen frames into Claude Code. Frames can come from
        the Spectr CLI (above), a Figma export, screen captures from your phone, or anywhere.
        Skill works with any vertical iOS-shaped imagery.
      </>
    ),
  },
  {
    title: 'Invoke the skill',
    body: (
      <>
        The skill is bundled with the MCP install — running <code>claude mcp add spectr ...</code> puts
        it in <code>~/.claude/skills/spectr/</code> for you. If you skipped the MCP install, drop
        the <code>SKILL.md</code> file there manually.
      </>
    ),
    command: '/spectr',
    commandLabel: 'In Claude Code',
  },
  {
    title: 'Get the spec.md back',
    body: (
      <>
        Same 7-section output as the MCP path, but you control the frames going in. Useful when
        you want to inspect what Spectr sees before paying for vision tokens, or when you have
        a non-MP4 source (Figma frames, design comps, screenshots from any platform).
      </>
    ),
  },
]

const STEPS_BY_TAB: Record<TabKey, Step[]> = {
  mcp: MCP_STEPS,
  cli: CLI_STEPS,
  skill: SKILL_STEPS,
}

export default function InstallTabs({ defaultTab = 'mcp' }: InstallTabsProps) {
  const [tab, setTab] = useState<TabKey>(defaultTab)
  const steps = STEPS_BY_TAB[tab]

  return (
    <div className="mcp-tabs-wrap">
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
            <span className="mcp-tab-label">{t.label}</span>
            <span className="mcp-tab-sub">{t.sublabel}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`mcp-tab-panel-${tab}`}
        aria-labelledby={`mcp-tab-${tab}`}
        className="mcp-tab-panel"
        key={tab}
      >
        <ol className="mcp-steps-flow">
          {steps.map((step, i) => (
            <li key={i} className="mcp-step-flow">
              <div className="mcp-step-flow-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="mcp-step-flow-body">
                <h3 className="mcp-step-flow-title">{step.title}</h3>
                <p className="mcp-step-flow-text">{step.body}</p>
                {step.command ? (
                  <CopyableCommand value={step.command} label={step.commandLabel ?? 'Copy'} />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
