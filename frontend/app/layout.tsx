import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Spectr — See an app. Ship an app.',
  description: 'Upload a screen recording. Get a full-stack Claude Code spec in 60 seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen`}>
        <ToastProvider>
          <div className="site-bg" />
          <nav className="site-nav">
            <div className="page-shell site-nav-inner">
              <Link href="/" className="brand-lockup" aria-label="Spectr home">
                <span className="brand-mark" />
                <span className="brand-copy">
                  <span className="brand-name">SPECTR</span>
                  <span className="brand-tag">Reverse-engineered product specs</span>
                </span>
              </Link>
              <div className="site-nav-links">
                <Link href="/app/projects" className="site-link">Projects</Link>
                <Link href="/app" className="btn-primary nav-cta">New spec</Link>
              </div>
            </div>
          </nav>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
