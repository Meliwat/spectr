import type { Metadata } from 'next'
import Link from 'next/link'
import SpectrBackground from './SpectrBackground'
import InstallTabs from './InstallTabs'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Spectr — Connect Spectr to Claude in one command',
  description:
    'Install Spectr in one command. MCP server, CLI, or Claude skill. Drop in any iOS app recording and get back a production-ready DESIGN.md in 3 minutes. Runs on your Claude subscription.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Spectr — Connect Spectr to Claude in one command',
    description:
      'Install Spectr in one command. MCP server, CLI, or Claude skill. Runs on your Claude subscription.',
    url: SITE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectr — Connect Spectr to Claude in one command',
    description:
      'Install Spectr in one command. MCP server, CLI, or Claude skill.',
  },
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'Claude Code MCP',
    'Claude connector',
    'Spectr install',
    'app spec generator',
    'design tokens extraction',
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
            Connect Spectr to <span className="mcp-grad">Claude</span> in one command.
          </h1>
          <p className="mcp-subhead">
            Pick a path below. Drop in any iOS app, get back a production-ready{' '}
            <code>DESIGN.md</code> in three minutes — on your own Claude subscription.
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
