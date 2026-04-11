import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spectr — See an app. Ship an app.',
  description: 'Upload a screen recording. Get a full-stack Claude Code spec in 60 seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <nav className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/" className="mono font-bold text-lg" style={{ color: 'var(--violet)', letterSpacing: '-0.02em' }}>SPECTR</a>
          <a href="/app/projects" className="text-sm" style={{ color: 'var(--muted)', fontWeight: 510 }}>Projects</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
