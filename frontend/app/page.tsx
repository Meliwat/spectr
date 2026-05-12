import type { Metadata } from 'next'
import Link from 'next/link'
import SpectrBackground from './SpectrBackground'
import InstallTabs from './InstallTabs'
import FAQ from './FAQ'

const SITE_URL = 'https://www.spectr.to'

export const metadata: Metadata = {
  title: 'Spectr — Turn Claude Code into an award-winning iOS designer',
  description:
    'Connect Spectr to Claude Code, Cursor, or Codex. Drop in any iOS app. Get a production-ready spec.md back in 5 minutes — exact hex codes, exact font sizes, exact spacing. Free, local, runs on your Claude subscription.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Spectr — Turn Claude Code into an award-winning iOS designer',
    description:
      'Connect Spectr to your AI agent. Drop in any iOS app. Get back a complete spec.md in 5 minutes. Free, local, runs on your Claude subscription.',
    url: SITE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectr — Turn Claude Code into an award-winning iOS designer',
    description:
      'Connect Spectr to your AI agent. Drop in any iOS app. Get back a complete spec.md in 5 minutes.',
  },
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'Claude Code MCP',
    'Cursor MCP',
    'Codex MCP',
    'app spec generator',
    'React Native spec',
    'Expo spec',
    'design tokens extraction',
    'iOS app clone',
    'reverse engineering UI',
    'iOS design blueprint',
  ],
}

const EXAMPLE_CONVERSATION = `you  ›  Generate a spec from
       https://apps.apple.com/us/app/duolingo/id570060128
       and save it to ./duolingo-spec.md

cc   ›  ↪ spectr.generate_spec({
            source: "https://apps.apple.com/us/app/duolingo/...",
            output_path: "./duolingo-spec.md"
          })

         ⏱  Scraping App Store screenshots…
         ⏱  Vision pass: screen analysis (20 frames)
         ⏱  Vision pass: design tokens (20 frames)
         ⏱  Writing 7 spec sections in 4 parallel lanes
         ✓  Done in 4m 32s

         Spec written to ./duolingo-spec.md
         (124,560 chars, 7 top-level sections).

you  ›  Read it and scaffold the React Native clone
       in apps/duo-clone/`

const USE_CASES: { title: string; body: string; tag: string }[] = [
  {
    tag: 'Competitive analysis',
    title: 'Clone the leader',
    body: 'Pick any iOS app on the App Store, get its full spec in 5 minutes. Use it as a baseline before you redesign, or as scaffolding for a fast-follow.',
  },
  {
    tag: 'Design handoff',
    title: 'Designer → engineer, without the doc',
    body: 'Record a Figma prototype walkthrough. Spectr writes the spec your engineering team would have asked for — exact tokens, every state, navigation graph included.',
  },
  {
    tag: 'Audit',
    title: 'Measure your own product',
    body: 'Spec your current app first. Now your redesign starts from a measurable baseline instead of a hot take.',
  },
  {
    tag: 'Reverse-engineering',
    title: 'Document a flow that has no docs',
    body: 'Want to know exactly how Spotify handles signup? Record the flow, get the spec. Every screen, every empty state, every micro-interaction.',
  },
  {
    tag: 'Onboarding',
    title: 'Inherit a codebase you have never seen',
    body: 'New job, no docs, three engineers gone. Generate the spec from the App Store before you open a single file. Read it like a tour guide.',
  },
  {
    tag: 'Prototyping',
    title: 'Skip the design phase',
    body: 'You have an idea but no designer. Pick a reference app shaped like what you want, get the spec, ask Claude Code to build it. First scaffold in an hour.',
  },
]

const FEATURES: { title: string; body: string }[] = [
  {
    title: '7 structured sections',
    body: 'App overview, navigation architecture, screen-by-screen specs, component library, design system, implementation notes, and a Claude Code prompt.',
  },
  {
    title: 'Exact values',
    body: "Hex codes, pixel sizes, font weights, line heights, letter spacing, spacing scales. No 'a calming blue.' Just #1A73E8.",
  },
  {
    title: 'Expo SDK 54 + React Native',
    body: 'Specs target the modern Expo / RN stack. iPhone 15 baseline. Drop the Claude Code prompt and start building.',
  },
  {
    title: '80–150 KB of markdown',
    body: 'Big enough to be complete, small enough to fit in a context window. Renders cleanly in any editor.',
  },
  {
    title: 'App Store or MP4 input',
    body: 'Hand it the App Store URL for fast results, or drop an MP4 screen recording for richer coverage of less-public apps.',
  },
  {
    title: 'No upload to a server',
    body: 'Everything runs locally on your machine. Your screen recordings never leave your laptop.',
  },
]

export default function HomePage() {
  return (
    <main className="mcp-page">
      <section className="mcp-hero">
        <SpectrBackground />
        <div className="page-shell mcp-hero-inner">
          <span className="eyebrow">v0.1.0 · MCP Server · CLI · Claude Code Skill</span>
          <h1 className="mcp-headline">
            Turn <span className="mcp-grad">Claude Code</span> into an award-winning iOS designer.
          </h1>
          <p className="mcp-subhead">
            Connect Spectr to Claude Code, Cursor, or Codex. Drop in any iOS app. Get back a
            production-ready <code>spec.md</code> in five minutes — precise enough to build a
            pixel-perfect clone.
          </p>

          <InstallTabs />

          <div className="mcp-hero-ctas">
            <Link href="/gallery" className="btn-primary">
              Browse the gallery <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://github.com/Meliwat/spectr"
              target="_blank"
              rel="noopener noreferrer"
              className="mcp-cta-ghost"
            >
              Star on GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>

          <ul className="mcp-meta-row">
            <li><span className="mcp-meta-dot" /> Free + local</li>
            <li><span className="mcp-meta-dot" /> Runs on your Claude subscription</li>
            <li><span className="mcp-meta-dot" /> No API key required</li>
            <li><span className="mcp-meta-dot" /> 2–10 min per run</li>
          </ul>
        </div>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">What you get</span>
        <h2 className="mcp-section-title">A complete blueprint, not a vibe check.</h2>
        <div className="mcp-features">
          {FEATURES.map((f) => (
            <div className="mcp-feature" key={f.title}>
              <h3 className="mcp-feature-title">{f.title}</h3>
              <p className="mcp-feature-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">Built for the work</span>
        <h2 className="mcp-section-title">From idea to clone in one conversation.</h2>
        <p className="mcp-section-sub">
          Tell your AI agent what app you want. Spectr handles the rest — frame extraction,
          vision analysis, spec writing, all the gymnastics nobody likes doing manually.
        </p>
        <div className="mcp-usecases">
          {USE_CASES.map((u) => (
            <div className="mcp-usecase" key={u.title}>
              <span className="mcp-usecase-tag">{u.tag}</span>
              <h3 className="mcp-usecase-title">{u.title}</h3>
              <p className="mcp-usecase-body">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">Example</span>
        <h2 className="mcp-section-title">Inside Claude Code, it looks like this.</h2>
        <pre className="mcp-example"><code>{EXAMPLE_CONVERSATION}</code></pre>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">Frequently asked</span>
        <h2 className="mcp-section-title">Friction points, removed.</h2>
        <FAQ />
      </section>

      <section className="mcp-final-wrap">
        <div className="page-shell mcp-final-inner">
          <span className="eyebrow">Install Spectr</span>
          <h2 className="mcp-final-title">
            Your AI agent just got an <span className="mcp-grad">eye for design</span>.
          </h2>
          <p className="mcp-final-sub">
            Install in 30 seconds. Generate your first spec in under 5 minutes. Browse the gallery
            for examples of what Spectr produces against real apps.
          </p>
          <div className="mcp-final-ctas">
            <Link href="/gallery" className="btn-primary mcp-final-btn">
              Open the gallery <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://github.com/Meliwat/spectr"
              target="_blank"
              rel="noopener noreferrer"
              className="mcp-cta-ghost"
            >
              View the source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
