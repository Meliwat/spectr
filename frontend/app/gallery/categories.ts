import type { AppSlug } from './apps'

export const CATEGORIES = [
  'social',
  'messaging',
  'travel',
  'music',
  'video',
  'food',
  'finance',
  'fitness',
  'productivity',
  'dating',
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
  finance: 'Finance',
  fitness: 'Fitness',
  productivity: 'Productivity',
  dating: 'Dating',
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
  travel: ['airbnb', 'uber', 'google-maps', 'apple-maps', 'waze'],
  music: ['spotify', 'apple-music'],
  video: ['youtube', 'netflix'],
  food: ['doordash', 'starbucks'],
  finance: ['venmo', 'cash-app', 'paypal', 'robinhood', 'coinbase', 'apple-wallet'],
  fitness: ['strava', 'nike-run-club', 'headspace', 'myfitnesspal', 'whoop'],
  productivity: ['notion', 'figma', 'apple-notes', 'todoist', 'google-calendar'],
  dating: ['tinder', 'hinge', 'bumble'],
  misc: ['chatgpt', 'claude', 'perplexity', 'gmail', 'amazon', 'cal-ai', 'duolingo'],
}

export function isCategorySlug(slug: string): slug is CategorySlug {
  return (CATEGORIES as readonly string[]).includes(slug)
}
