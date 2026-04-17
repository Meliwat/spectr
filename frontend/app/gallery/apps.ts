import { extractPhoneDocument } from '@/lib/extract-phone'

export const APPS = [
  'airbnb',
  'cal-ai',
  'doordash',
  'duolingo',
  'instagram',
  'spotify',
  'tiktok',
  'uber',
] as const

export type AppSlug = (typeof APPS)[number]

export const TITLES: Record<AppSlug, string> = {
  airbnb: 'Airbnb',
  'cal-ai': 'Cal AI',
  doordash: 'DoorDash',
  duolingo: 'Duolingo',
  instagram: 'Instagram',
  spotify: 'Spotify',
  tiktok: 'TikTok',
  uber: 'Uber',
}

export function isAppSlug(slug: string): slug is AppSlug {
  return (APPS as readonly string[]).includes(slug)
}

export function specGithubUrl(slug: AppSlug): string {
  return `https://github.com/Meliwat/awesome-ios-design-md/tree/main/design-md/${slug}`
}

export async function fetchPhone(slug: AppSlug): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/Meliwat/awesome-ios-design-md/main/design-md/${slug}/preview-dark.html`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const raw = await res.text()
    return extractPhoneDocument(raw)
  } catch {
    return null
  }
}
