import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { ToastProvider } from '@/components/Toast'
import SiteNav from './SiteNav'
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
          <SiteNav />
          {children}
        </ToastProvider>
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  )
}
