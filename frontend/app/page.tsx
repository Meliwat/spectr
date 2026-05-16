import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = 'https://www.spectr.to'

export const metadata: Metadata = {
  title: 'Spectr — See an app. Ship an app.',
  description:
    'Record any mobile app. Spectr turns it into a production-ready DESIGN.md in three minutes — exact hex codes, exact font weights, exact spacing. Ready for your AI coding agent to build from.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Spectr — See an app. Ship an app.',
    description:
      'Record any mobile app. Spectr turns it into a production-ready DESIGN.md your AI coding agent can build from.',
    url: SITE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectr — See an app. Ship an app.',
    description:
      'Record any mobile app. Spectr turns it into a production-ready DESIGN.md your AI coding agent can build from.',
  },
}

const FEATURES: { title: string; body: string }[] = [
  {
    title: 'Pixel-exact tokens',
    body: 'Every hex code, font weight, corner radius, and spacing value — pulled from the real app, not guessed.',
  },
  {
    title: 'Every screen, folded in',
    body: 'Spectr walks the whole recording and writes one canonical DESIGN.md covering each screen and flow.',
  },
  {
    title: 'Built for your agent',
    body: 'The output drops straight into Claude Code, Cursor, or any coding agent. Ship a pixel-perfect clone.',
  },
]

export default function HomePage() {
  return (
    <main className="home">
      <div className="home-glow" aria-hidden="true" />

      <section className="page-shell home-hero">
        <h1 className="home-headline">
          See an app.
          <br />
          <span className="home-headline-2">Ship an app.</span>
        </h1>

        <div className="home-subrow">
          <p className="home-subhead">
            Record any mobile app. Spectr turns it into a production-ready{' '}
            <code>DESIGN.md</code> — exact hex codes, exact font weights, exact
            spacing. Ready for your AI coding agent to build from.
          </p>

          <Link href="/gallery" className="home-announce">
            <span className="home-announce-dot" aria-hidden="true" />
            <span className="home-announce-label">100 design blueprints live</span>
            <span className="home-announce-link">
              Browse <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>

        <div className="home-ctas">
          <Link href="/installation" className="btn-primary home-cta-primary">
            Install Spectr <span aria-hidden="true">→</span>
          </Link>
          <a
            href="https://github.com/Meliwat/spectr"
            target="_blank"
            rel="noopener noreferrer"
            className="home-cta-ghost"
          >
            Star on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="page-shell home-product">
        <div className="home-window">
          <div className="home-window-bar">
            <span className="home-window-dots" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="home-window-title">recording.mp4 → DESIGN.md</span>
          </div>

          <div className="home-window-body">
            <div className="home-phone">
              <video
                className="home-phone-video"
                src="/demo/spectr-demo.mp4"
                poster="/demo/spectr-demo-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Spectr turning a screen recording into a design spec"
              />
            </div>

            <pre className="home-spec" aria-hidden="true">
{`# DESIGN.md

## 1 · Design Language
accent      #5E6AD2
background  #08090A
text        #F7F8F8

## 2 · Type Scale
display     32 / 600 / -0.03em
body        15 / 400 /  0.00em

## 3 · Spacing
unit        4px   ·   gutter 20px
radius      6 / 12 / 22

## 4 · Screens
[01] Home      ✓ tokens  ✓ layout
[02] Detail    ✓ tokens  ✓ layout
[03] Checkout  ✓ tokens  ✓ layout

→ 3 min · pixel-perfect · agent-ready`}
            </pre>
          </div>
        </div>
      </section>

      <section className="page-shell home-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="home-feature">
            <h2 className="home-feature-title">{f.title}</h2>
            <p className="home-feature-body">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="home-final">
        <div className="page-shell home-final-inner">
          <h2 className="home-final-title">See an app. Ship an app.</h2>
          <p className="home-final-sub">
            One command connects Spectr to Claude. Drop in a recording, get a
            blueprint your agent can build from.
          </p>
          <div className="home-ctas home-final-ctas">
            <Link href="/installation" className="btn-primary home-cta-primary">
              Install Spectr <span aria-hidden="true">→</span>
            </Link>
            <Link href="/gallery" className="home-cta-ghost">
              Browse the gallery <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
