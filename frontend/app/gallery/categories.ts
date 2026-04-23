import type { AppSlug } from './apps'

export const CATEGORIES = [
  'social',
  'messaging',
  'travel',
  'music',
  'video',
  'food',
  'misc',
] as const

export type CategorySlug = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  social: 'Social',
  messaging: 'Messaging',
  travel: 'Travel',
  music: 'Music',
  video: 'Video',
  food: 'Food',
  misc: 'Misc',
}

export const CATEGORY_APPS: Record<CategorySlug, AppSlug[]> = {
  social: [
    'instagram',
    'tiktok',
    'x-twitter',
    'threads',
    'facebook',
    'snapchat',
    'reddit',
    'pinterest',
    'linkedin',
  ],
  messaging: ['whatsapp', 'telegram', 'discord', 'slack'],
  travel: ['airbnb', 'uber', 'google-maps'],
  music: ['spotify', 'apple-music'],
  video: ['youtube', 'netflix'],
  food: ['doordash', 'starbucks'],
  misc: ['chatgpt', 'notion', 'gmail', 'venmo', 'amazon', 'tinder', 'cal-ai', 'duolingo'],
}

export function isCategorySlug(slug: string): slug is CategorySlug {
  return (CATEGORIES as readonly string[]).includes(slug)
}
