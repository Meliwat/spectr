import type { Metadata } from 'next'
import HomeClient from './HomeClient'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Spectr — See an app. Ship an app.',
  description:
    'Record any app. Get a UI blueprint inspired by it — ready for your AI coding agent to build.',
  alternates: { canonical: '/' },
  openGraph: {
    url: SITE_URL,
    title: 'Spectr — See an app. Ship an app.',
    description:
      'Record any app. Get a UI blueprint inspired by it — ready for your AI coding agent to build.',
  },
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Spectr',
  description:
    'Spectr turns a screen recording of any mobile app into a production-ready product blueprint — screens, design system, navigation, and components — ready for an AI coding agent.',
  url: SITE_URL,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '19',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Organization',
    name: 'Spectr',
    url: SITE_URL,
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Spectr',
  url: SITE_URL,
  logo: `${SITE_URL}/brand/spectr-symbol.png`,
  slogan: 'See an app. Ship an app.',
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HomeClient />
    </>
  )
}
