import type { Metadata } from 'next'
import Link from 'next/link'
import SpectrBackground from './SpectrBackground'
import CopyableCommand from './CopyableCommand'

const SITE_URL = 'https://www.spectr.to'

export const metadata: Metadata = {
  title: 'Spectr — generate iOS app specs from inside Claude Code',
  description:
    'Drop in the Spectr MCP. Hand it an App Store URL or a screen recording. Get a production-ready spec.md back in 5 minutes — precise enough for Claude Code to build a clone from. Free, runs on your Claude subscription.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Spectr — generate iOS app specs from inside Claude Code',
    description:
      'Drop in the MCP. Point at any app. Get a complete spec.md back in 5 minutes. Free, local, runs on your Claude subscription.',
    url: SITE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectr — generate iOS app specs from inside Claude Code',
    description:
      'Drop in the MCP. Point at any app. Get a complete spec.md back in 5 minutes.',
  },
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'Claude Code MCP',
    'Cursor MCP',
    'app spec generator',
    'React Native spec',
    'Expo spec',
    'design tokens extraction',
    'iOS app clone',
    'reverse engineering UI',
    'iOS design blueprint',
  ],
}

const INSTALL_CMD = `claude mcp add spectr -- uvx --from git+https://github.com/Meliwat/spectr spectr-mcp`

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

export default function HomePage() {
  return (
    <main className="mcp-page">
      <section className="mcp-hero">
        <SpectrBackground />
        <div className="page-shell mcp-hero-inner">
          <span className="eyebrow">v0.1.0 · MCP Server</span>
          <h1 className="mcp-headline">
            Generate iOS app specs from inside <span className="mcp-grad">Claude Code</span>.
          </h1>
          <p className="mcp-subhead">
            Drop in the Spectr MCP. Hand it an App Store URL or a screen recording.
            Get a production-ready <code>spec.md</code> back in five minutes — precise
            enough for Claude Code to build a clone from.
          </p>

          <CopyableCommand value={INSTALL_CMD} />

          <div className="mcp-hero-ctas">
            <Link href="/gallery" className="btn-primary">
              Browse the gallery <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://github.com/Meliwat/spectr/tree/master/spectr_mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="mcp-cta-ghost"
            >
              Read the docs <span aria-hidden="true">↗</span>
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
        <span className="eyebrow">How it works</span>
        <h2 className="mcp-section-title">Three steps from an app to a buildable spec.</h2>
        <div className="mcp-steps">
          <Step
            n={1}
            title="Install"
            body="One command. Claude Code (or Cursor / Codex) adds the MCP and remembers it across sessions."
          />
          <Step
            n={2}
            title="Point at any app"
            body="Paste an App Store URL or drop an MP4 of a screen recording. Spectr extracts frames and runs vision analysis."
          />
          <Step
            n={3}
            title="Get spec.md back"
            body="A 7-section markdown spec lands on disk: app overview, navigation, screen-by-screen specs, exact design tokens, components, and a Claude Code prompt to build it."
          />
        </div>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">Example</span>
        <h2 className="mcp-section-title">Inside Claude Code, it looks like this.</h2>
        <pre className="mcp-example"><code>{EXAMPLE_CONVERSATION}</code></pre>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">What you get</span>
        <h2 className="mcp-section-title">A complete blueprint, not a vibe check.</h2>
        <div className="mcp-features">
          <Feature title="7 structured sections" body="App overview, navigation architecture, screen-by-screen specs, component library, design system, implementation notes, and a Claude Code prompt." />
          <Feature title="Exact values" body="Hex codes, pixel sizes, font weights, line heights, letter spacing, spacing scales. No 'a calming blue.' Just #1A73E8." />
          <Feature title="Expo SDK 54 + React Native" body="Specs target the modern Expo / RN stack. iPhone 15 baseline. Drop the Claude Code prompt and start building." />
          <Feature title="80–150 KB of markdown" body="Big enough to be complete, small enough to fit in a context window. Renders cleanly in any editor." />
          <Feature title="App Store or MP4 input" body="Hand it the App Store URL for fast results, or drop an MP4 screen recording for richer coverage of less-public apps." />
          <Feature title="No upload to a server" body="Everything runs locally on your machine. Your screen recordings never leave your laptop." />
        </div>
      </section>

      <section className="page-shell mcp-section">
        <div className="mcp-cost">
          <span className="eyebrow">Cost</span>
          <h2 className="mcp-section-title">Runs on your existing Claude subscription.</h2>
          <p className="mcp-cost-line">
            The MCP shells out to the <code>claude</code> CLI by default. If you have
            Claude Code installed and logged in, that's all you need — vision + spec
            generation are billed to <strong>your Claude Pro / Max plan</strong>, not to Spectr.
          </p>
          <p className="mcp-cost-line">
            Prefer to pay Anthropic by token? Set <code>ANTHROPIC_API_KEY</code> in
            your environment and the MCP will use the SDK instead. Roughly <strong>$0.60–$1.20</strong> per
            spec at the default <code>max_frames=20</code>.
          </p>
          <p className="mcp-cost-line mcp-cost-alt">
            Want it hosted with a progress UI and retries? <Link href="/gallery">spectr.to</Link> is on the way back.
          </p>
        </div>
      </section>

      <section className="page-shell mcp-section">
        <span className="eyebrow">Requirements</span>
        <h2 className="mcp-section-title">Two things, two minutes.</h2>
        <ul className="mcp-reqs">
          <li>
            <span className="mcp-req-key">Claude Code (or any MCP client)</span>
            <span className="mcp-req-val">
              The MCP is launched as a stdio subprocess by your client. Install Claude
              Code from <a href="https://www.claude.com/product/claude-code" target="_blank" rel="noopener noreferrer">claude.com/product/claude-code</a>, run <code>claude login</code> once,
              and you're done. Cursor / Codex / any MCP-compatible host also works.
            </span>
          </li>
          <li>
            <span className="mcp-req-key"><code>ffmpeg</code></span>
            <span className="mcp-req-val">Only required when passing an MP4 recording. Not needed if you're using App Store URLs.</span>
          </li>
        </ul>
      </section>

      <section className="page-shell mcp-section mcp-final">
        <span className="eyebrow">Browse the gallery</span>
        <h2 className="mcp-section-title">See what specs look like, first.</h2>
        <p className="mcp-final-sub">
          Eight reference apps already specced — Duolingo, DoorDash, Spotify, TikTok, Uber,
          Instagram, Cal AI, Airbnb. Live HTML previews of each. The MCP produces the
          same shape of output, freshly, against any app you point it at.
        </p>
        <Link href="/gallery" className="btn-primary mcp-final-btn">
          Open the gallery <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mcp-step">
      <span className="mcp-step-num">{n.toString().padStart(2, '0')}</span>
      <h3 className="mcp-step-title">{title}</h3>
      <p className="mcp-step-body">{body}</p>
    </div>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="mcp-feature">
      <h3 className="mcp-feature-title">{title}</h3>
      <p className="mcp-feature-body">{body}</p>
    </div>
  )
}
