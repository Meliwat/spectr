import type { MetadataRoute } from 'next'
import { APPS } from './gallery/apps'
import { CATEGORIES } from './gallery/categories'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/mcp`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    ...CATEGORIES.map((slug) => ({
      url: `${SITE_URL}/gallery/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...APPS.map((slug) => ({
      url: `${SITE_URL}/gallery/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
