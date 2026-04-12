import type { Metadata } from 'next'
import Image from 'next/image'
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
  description: 'Upload a mobile app recording and receive a beautifully structured product brief with screens, flow, and design language.',
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
                <Image
                  src="/brand/spectr-logotype.png"
                  alt=""
                  aria-hidden="true"
                  width={1522}
                  height={639}
                  priority
                  className="brand-logotype"
                />
              </Link>
              <div className="site-nav-links">
                <Link href="/app/projects" className="site-link">Briefs</Link>
                <Link href="/app" className="btn-primary nav-cta">New brief</Link>
              </div>
            </div>
          </nav>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
