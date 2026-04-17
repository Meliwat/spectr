import type { MetadataRoute } from 'next'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/gallery'],
        disallow: [
          '/api/',
          '/app/',
          '/admin',
          '/login',
          '/auth/',
          '/p/',
          '/spectr-enter',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
