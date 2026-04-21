import fs from 'node:fs/promises'
import path from 'node:path'
import { extractPhoneDocument } from '@/lib/extract-phone'

export const APPS = [
  'airbnb',
  'amazon',
  'apple-music',
  'cal-ai',
  'chatgpt',
  'discord',
  'doordash',
  'duolingo',
  'facebook',
  'gmail',
  'google-maps',
  'instagram',
  'linkedin',
  'netflix',
  'notion',
  'pinterest',
  'reddit',
  'slack',
  'snapchat',
  'spotify',
  'starbucks',
  'telegram',
  'threads',
  'tiktok',
  'tinder',
  'uber',
  'venmo',
  'whatsapp',
  'x-twitter',
  'youtube',
] as const

export type AppSlug = (typeof APPS)[number]

export const TITLES: Record<AppSlug, string> = {
  airbnb: 'Airbnb',
  amazon: 'Amazon',
  'apple-music': 'Apple Music',
  'cal-ai': 'Cal AI',
  chatgpt: 'ChatGPT',
  discord: 'Discord',
  doordash: 'DoorDash',
  duolingo: 'Duolingo',
  facebook: 'Facebook',
  gmail: 'Gmail',
  'google-maps': 'Google Maps',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  netflix: 'Netflix',
  notion: 'Notion',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  slack: 'Slack',
  snapchat: 'Snapchat',
  spotify: 'Spotify',
  starbucks: 'Starbucks',
  telegram: 'Telegram',
  threads: 'Threads',
  tiktok: 'TikTok',
  tinder: 'Tinder',
  uber: 'Uber',
  venmo: 'Venmo',
  whatsapp: 'WhatsApp',
  'x-twitter': 'X (Twitter)',
  youtube: 'YouTube',
}

export function isAppSlug(slug: string): slug is AppSlug {
  return (APPS as readonly string[]).includes(slug)
}

// Only the original 8 apps have full spec markdown published externally.
const APPS_WITH_EXTERNAL_SPEC: ReadonlySet<AppSlug> = new Set<AppSlug>([
  'airbnb',
  'cal-ai',
  'doordash',
  'duolingo',
  'instagram',
  'spotify',
  'tiktok',
  'uber',
])

export function specGithubUrl(slug: AppSlug): string | null {
  if (!APPS_WITH_EXTERNAL_SPEC.has(slug)) return null
  return `https://github.com/Meliwat/awesome-ios-design-md/tree/main/design-md/${slug}`
}

const PREVIEWS_DIR = path.join(process.cwd(), 'previews-private')

export async function fetchPhone(slug: AppSlug): Promise<string | null> {
  try {
    const filePath = path.join(PREVIEWS_DIR, slug, 'index.html')
    const raw = await fs.readFile(filePath, 'utf8')
    return extractPhoneDocument(raw)
  } catch {
    return null
  }
}
