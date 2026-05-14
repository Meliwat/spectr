import type { Metadata } from 'next'
import Link from 'next/link'
import SpectrBackground from './SpectrBackground'
import InstallTabs from './InstallTabs'

const SITE_URL = 'https://www.spectr.to'

export const metadata: Metadata = {
  title: 'Spectr — Turn Claude into an award-winning iOS designer',
  description:
    'Connect Spectr to Claude. Drop in any iOS app. Get back a production-ready DESIGN.md in 3 minutes — exact hex codes, exact font sizes, exact spacing. Runs on your Claude subscription.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Spectr — Turn Claude into an award-winning iOS designer',
    description:
      'Connect Spectr to Claude. Drop in any iOS app. Get back a complete DESIGN.md in 3 minutes. Runs on your Claude subscription.',
    url: SITE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectr — Turn Claude into an award-winning iOS designer',
    description:
      'Connect Spectr to Claude. Drop in any iOS app. Get back a complete DESIGN.md in 3 minutes.',
  },
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'Claude Code MCP',
    'Claude connector',
    'app spec generator',
    'React Native spec',
    'Expo spec',
    'design tokens extraction',
    'iOS app clone',
    'reverse engineering UI',
    'iOS design blueprint',
  ],
}

export default function HomePage() {
  return (
    <main className="mcp-page">
      <section className="mcp-hero">
        <SpectrBackground />
        <div className="page-shell mcp-hero-inner">
          <span className="eyebrow">v0.2.0 · MCP Server · CLI · Claude Skill</span>
          <h1 className="mcp-headline">
            Turn <span className="mcp-grad">Claude</span> into an award-winning iOS designer.
          </h1>
          <p className="mcp-subhead">
            Drop in any iOS app. Get back a production-ready{' '}
            <code>DESIGN.md</code> in three minutes, precise enough to build a pixel-perfect clone.
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
        </div>
      </section>
    </main>
  )
}
