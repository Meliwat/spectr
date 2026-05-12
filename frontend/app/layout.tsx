import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim()

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Spectr — See an app. Ship an app.',
    template: '%s — Spectr',
  },
  description:
    'Upload a mobile app recording and receive a beautifully structured product blueprint with screens, flow, and design language — ready for your AI coding agent.',
  applicationName: 'Spectr',
  keywords: [
    'app blueprint',
    'app spec generator',
    'screen recording to spec',
    'React Native scaffold',
    'Expo app generator',
    'AI coding agent',
    'Claude Code',
    'product design spec',
    'mobile app clone',
    'UI reverse engineering',
  ],
  authors: [{ name: 'Spectr' }],
  creator: 'Spectr',
  publisher: 'Spectr',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Spectr',
    url: SITE_URL,
    title: 'Spectr — See an app. Ship an app.',
    description:
      'Record any mobile app. Spectr turns it into a production-ready blueprint your AI coding agent can build from.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectr — See an app. Ship an app.',
    description:
      'Record any mobile app. Spectr turns it into a production-ready blueprint your AI coding agent can build from.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  category: 'technology',
  verification: {
    google: 'MPPIJJTM8bPdz-CpatPhEcmgPxTyt0PlItnnFUuR1to',
  },
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
                <Image
                  src="/brand/spectr-symbol.png"
                  alt=""
                  aria-hidden="true"
                  width={720}
                  height={893}
                  priority
                  className="brand-symbol"
                />
                <span className="brand-neon-text" aria-hidden="true">Spectr</span>
              </Link>
              <div className="site-nav-links">
                <Link href="/" className="nav-text-link">
                  Gallery
                </Link>
                <Link href="/mcp" className="nav-text-link">
                  MCP
                </Link>
                <span className="nav-icon-sep" aria-hidden="true" />
                <a
                  href="https://github.com/Meliwat/spectr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-icon-link"
                  aria-label="GitHub"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </a>
                <span className="nav-icon-sep" aria-hidden="true" />
                <a
                  href="#"
                  className="nav-icon-link"
                  aria-label="X / Twitter"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>
          </nav>
          {children}
        </ToastProvider>
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  )
}
