import fs from 'node:fs/promises'
import path from 'node:path'
import { extractPhoneDocument } from '@/lib/extract-phone'

export const APPS = [
  'airbnb',
  'amazon',
  'apple-maps',
  'apple-music',
  'apple-notes',
  'apple-wallet',
  'bumble',
  'cal-ai',
  'cash-app',
  'chatgpt',
  'claude',
  'coinbase',
  'discord',
  'doordash',
  'duolingo',
  'facebook',
  'figma',
  'gmail',
  'google-calendar',
  'google-maps',
  'headspace',
  'hinge',
  'instagram',
  'linkedin',
  'myfitnesspal',
  'netflix',
  'nike-run-club',
  'notion',
  'paypal',
  'perplexity',
  'pinterest',
  'reddit',
  'robinhood',
  'slack',
  'snapchat',
  'spotify',
  'starbucks',
  'strava',
  'telegram',
  'threads',
  'tiktok',
  'tinder',
  'todoist',
  'uber',
  'venmo',
  'waze',
  'whatsapp',
  'whoop',
  'x-twitter',
  'youtube',
] as const

export type AppSlug = (typeof APPS)[number]

export const TITLES: Record<AppSlug, string> = {
  airbnb: 'Airbnb',
  amazon: 'Amazon',
  'apple-maps': 'Apple Maps',
  'apple-music': 'Apple Music',
  'apple-notes': 'Apple Notes',
  'apple-wallet': 'Apple Wallet',
  bumble: 'Bumble',
  'cal-ai': 'Cal AI',
  'cash-app': 'Cash App',
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  coinbase: 'Coinbase',
  discord: 'Discord',
  doordash: 'DoorDash',
  duolingo: 'Duolingo',
  facebook: 'Facebook',
  figma: 'Figma',
  gmail: 'Gmail',
  'google-calendar': 'Google Calendar',
  'google-maps': 'Google Maps',
  headspace: 'Headspace',
  hinge: 'Hinge',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  myfitnesspal: 'MyFitnessPal',
  netflix: 'Netflix',
  'nike-run-club': 'Nike Run Club',
  notion: 'Notion',
  paypal: 'PayPal',
  perplexity: 'Perplexity',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  robinhood: 'Robinhood',
  slack: 'Slack',
  snapchat: 'Snapchat',
  spotify: 'Spotify',
  starbucks: 'Starbucks',
  strava: 'Strava',
  telegram: 'Telegram',
  threads: 'Threads',
  tiktok: 'TikTok',
  tinder: 'Tinder',
  todoist: 'Todoist',
  uber: 'Uber',
  venmo: 'Venmo',
  waze: 'Waze',
  whatsapp: 'WhatsApp',
  whoop: 'WHOOP',
  'x-twitter': 'X (Twitter)',
  youtube: 'YouTube',
}

export function isAppSlug(slug: string): slug is AppSlug {
  return (APPS as readonly string[]).includes(slug)
}

export function specGithubUrl(slug: AppSlug): string {
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
