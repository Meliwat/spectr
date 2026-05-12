import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SpectrBackground from '../../SpectrBackground'
import HeroPhone from '../HeroPhone'
import {
  APPS,
  TITLES,
  fetchPhone,
  isAppSlug,
  specGithubUrl,
  type AppSlug,
} from '../apps'
import {
  CATEGORIES,
  CATEGORY_APPS,
  CATEGORY_LABELS,
  isCategorySlug,
} from '../categories'
import CategoryView from '../CategoryView'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

type AppCopy = {
  tagline: string
  blurb: string
  pitch: string
  keywords: string[]
  sector: string
  screens: string[]
}

const APP_COPY: Record<AppSlug, AppCopy> = {
  airbnb: {
    tagline: 'Build an Airbnb clone from a production-ready mobile design blueprint',
    blurb:
      'A complete UI blueprint of the Airbnb iOS app — every screen, color, spacing rule, and navigation pattern, extracted from a real screen recording and ready to hand to an AI coding agent.',
    pitch:
      'Use this spec as the starting point for a travel-booking or marketplace app. Every search input, listing card, map overlay, and stay detail screen is documented down to hex codes and pixel values.',
    keywords: [
      'airbnb clone',
      'airbnb ui kit',
      'airbnb react native template',
      'build an airbnb clone',
      'marketplace app design spec',
    ],
    sector: 'Travel & marketplace',
    screens: [
      'Home discovery feed',
      'Search + filters',
      'Map view with listings',
      'Listing detail',
      'Booking + checkout',
      'Trips + profile',
    ],
  },
  amazon: {
    tagline: 'Amazon UI blueprint — build a full-featured e-commerce app',
    blurb:
      'A complete spec of the Amazon iOS app — product search, listings, reviews, cart, checkout, and orders — captured with every color, type scale, and spacing rule intact.',
    pitch:
      'The reference blueprint for any marketplace, retail, or e-commerce app. Every product card, category rail, and review breakdown is documented with exact values.',
    keywords: [
      'amazon clone',
      'ecommerce app template',
      'amazon ui kit',
      'react native shopping app',
      'build an amazon clone',
    ],
    sector: 'E-commerce & retail',
    screens: [
      'Home + recommendations',
      'Category browse',
      'Product detail',
      'Reviews + ratings',
      'Cart + checkout',
      'Orders + tracking',
    ],
  },
  'apple-music': {
    tagline: 'Apple Music design blueprint — build a premium music app',
    blurb:
      'A full spec of the Apple Music iOS app — Listen Now, browse, search, library, now playing — captured in its signature dark-glass aesthetic with exact typography and spacing.',
    pitch:
      'Use this as the foundation for any music, podcast, or audio-streaming app where polish matters. Every blurred backdrop, gradient artwork, and player control is documented.',
    keywords: [
      'apple music clone',
      'music app ui kit',
      'audio streaming app template',
      'react native music player',
      'build an apple music clone',
    ],
    sector: 'Music & audio',
    screens: [
      'Listen Now',
      'Browse',
      'Search',
      'Library',
      'Now playing',
      'Playlist + album detail',
    ],
  },
  'cal-ai': {
    tagline: 'Cal AI design blueprint — build an AI calorie-tracking app',
    blurb:
      'A full mobile UI spec of Cal AI — onboarding, camera capture, macro breakdowns, streak tracking — reverse-engineered frame by frame so you can ship a visually comparable app.',
    pitch:
      'The ideal baseline for any AI-powered food, fitness, or health tracker. The blueprint covers every empty state, loading shimmer, and micro-interaction across the core flows.',
    keywords: [
      'cal ai clone',
      'calorie tracker app ui',
      'ai food tracker design',
      'build a cal ai clone',
      'react native fitness app template',
    ],
    sector: 'Health & AI',
    screens: [
      'Onboarding + goal setup',
      'Scan a meal (camera)',
      'Macro + calorie breakdown',
      'Daily log',
      'Streak + progress',
      'Settings + profile',
    ],
  },
  chatgpt: {
    tagline: 'ChatGPT UI blueprint — build an AI chat app from a real design spec',
    blurb:
      'The complete ChatGPT iOS app documented — conversation threads, composer, attachments, voice mode, history, and settings — with exact dark-mode tokens and type hierarchy.',
    pitch:
      'The cleanest reference for any LLM, assistant, or AI-chat app. Every message bubble, code block, streaming cursor, and tool-call indicator is captured.',
    keywords: [
      'chatgpt clone',
      'ai chat app template',
      'llm app ui kit',
      'react native ai assistant',
      'build a chatgpt clone',
    ],
    sector: 'AI & productivity',
    screens: [
      'New chat',
      'Conversation thread',
      'Composer + attachments',
      'Voice mode',
      'History + search',
      'Settings + account',
    ],
  },
  discord: {
    tagline: 'Discord design blueprint — build a community chat app',
    blurb:
      'A full spec of the Discord iOS app — servers, channels, DMs, threads, voice — with every role color, mention badge, and reaction pill documented down to the pixel.',
    pitch:
      'The go-to blueprint for any community, gaming, or group-chat app. Captures the dense information architecture that makes Discord feel instantly legible.',
    keywords: [
      'discord clone',
      'community chat app template',
      'discord ui kit',
      'react native chat app',
      'build a discord clone',
    ],
    sector: 'Community & chat',
    screens: [
      'Servers + channel list',
      'Channel chat',
      'Direct messages',
      'Threads',
      'Voice + video',
      'Profile + settings',
    ],
  },
  doordash: {
    tagline: 'DoorDash UI blueprint — build a food-delivery app from one spec',
    blurb:
      'Every DoorDash screen documented: discovery, cuisine filters, restaurant menus, cart, checkout, live order tracking. All design tokens, typography, and component states in one blueprint.',
    pitch:
      'The fastest way to scaffold a food-delivery clone. Use the spec to generate a React Native app that mirrors the DoorDash information architecture out of the gate.',
    keywords: [
      'doordash clone',
      'food delivery app template',
      'doordash ui design',
      'react native delivery app',
      'build a doordash clone',
    ],
    sector: 'Food delivery',
    screens: [
      'Home discovery',
      'Cuisine filter',
      'Restaurant menu',
      'Cart + checkout',
      'Live order tracking',
      'Orders history',
    ],
  },
  duolingo: {
    tagline: 'Duolingo design blueprint — build a gamified learning app',
    blurb:
      'A full spec of Duolingo — lesson paths, streak mechanics, XP animations, league screens, and the iconic character illustrations — reverse-engineered from the iOS app.',
    pitch:
      'Use this as the blueprint for any gamified education or habit app. Every reward animation, progress indicator, and hearts-based retry flow is documented.',
    keywords: [
      'duolingo clone',
      'duolingo ui kit',
      'gamified learning app design',
      'build a duolingo clone',
      'language learning app template',
    ],
    sector: 'Education & gamification',
    screens: [
      'Lesson path',
      'Lesson exercises',
      'Streak + hearts',
      'Leagues + leaderboards',
      'Profile + XP',
      'Store + gems',
    ],
  },
  facebook: {
    tagline: 'Facebook UI blueprint — build a social network app',
    blurb:
      'The Facebook iOS app captured screen by screen — News Feed, Stories, Marketplace, Groups, Reels, notifications — with exact typography, spacing, and card anatomy.',
    pitch:
      'The canonical blueprint for any large-scale social-network app. Covers the full information architecture: feed composition, reactions, comments, and cross-linked surfaces.',
    keywords: [
      'facebook clone',
      'social network app template',
      'facebook ui kit',
      'react native social feed',
      'build a facebook clone',
    ],
    sector: 'Social network',
    screens: [
      'News Feed',
      'Stories',
      'Marketplace',
      'Groups',
      'Reels',
      'Notifications + profile',
    ],
  },
  gmail: {
    tagline: 'Gmail design blueprint — build a modern email client',
    blurb:
      'A complete spec of Gmail on iOS — inbox categories, thread view, composer, labels, search, and multi-account switching — captured with exact Material-on-iOS styling.',
    pitch:
      'The ideal reference for any email, messaging, or communication app. Every sender avatar, snippet, attachment chip, and swipe action is documented.',
    keywords: [
      'gmail clone',
      'email app template',
      'gmail ui kit',
      'react native email client',
      'build an email app',
    ],
    sector: 'Email & productivity',
    screens: [
      'Inbox',
      'Thread view',
      'Composer',
      'Labels + categories',
      'Search',
      'Account switcher',
    ],
  },
  'google-maps': {
    tagline: 'Google Maps design blueprint — build a maps & navigation app',
    blurb:
      'A full spec of Google Maps on iOS — map canvas, search, place detail, directions, turn-by-turn navigation, transit — with every bottom-sheet height and pin style captured.',
    pitch:
      'The most-referenced blueprint for any mapping, navigation, or location-aware app. Documents how a map-first UI pairs with dense information overlays.',
    keywords: [
      'google maps clone',
      'maps app template',
      'navigation app ui kit',
      'react native maps',
      'build a maps app',
    ],
    sector: 'Maps & navigation',
    screens: [
      'Map + search',
      'Place detail',
      'Directions',
      'Turn-by-turn navigation',
      'Transit',
      'Saved + profile',
    ],
  },
  instagram: {
    tagline: 'Instagram UI blueprint — build a social feed app from a real spec',
    blurb:
      'The complete Instagram iOS app documented screen by screen — feed, stories, reels, explore, profile, DMs — with exact typography, color, and spacing tokens.',
    pitch:
      'The ultimate reference for any social, content, or creator app. Every double-tap like animation, story ring, and swipeable tab transition is captured.',
    keywords: [
      'instagram clone',
      'instagram ui kit',
      'social feed app template',
      'stories app design',
      'build an instagram clone',
    ],
    sector: 'Social & media',
    screens: [
      'Feed',
      'Stories + camera',
      'Reels',
      'Explore',
      'Profile',
      'Direct messages',
    ],
  },
  linkedin: {
    tagline: 'LinkedIn UI blueprint — build a professional network app',
    blurb:
      'A full spec of LinkedIn on iOS — feed, job search, messaging, profile, notifications — captured with the trademark blue palette and generous card padding.',
    pitch:
      'The reference blueprint for any professional-network, jobs, or recruiting app. Every connection badge, endorsement pill, and post reaction is documented.',
    keywords: [
      'linkedin clone',
      'professional network app template',
      'linkedin ui kit',
      'jobs app design',
      'build a linkedin clone',
    ],
    sector: 'Professional network',
    screens: [
      'Feed',
      'Job search',
      'Messaging',
      'Profile',
      'Notifications',
      'My Network',
    ],
  },
  netflix: {
    tagline: 'Netflix design blueprint — build a video streaming app',
    blurb:
      'The Netflix iOS app captured end to end — home rails, categories, title detail, player, downloads, profile — with the exact dark palette and card-shadow treatment.',
    pitch:
      'The definitive blueprint for any video, OTT, or streaming app. Every poster rail, autoplay preview, and billboard hero is documented.',
    keywords: [
      'netflix clone',
      'streaming app template',
      'netflix ui kit',
      'react native video app',
      'build a netflix clone',
    ],
    sector: 'Video & streaming',
    screens: [
      'Home rails',
      'Category browse',
      'Title detail',
      'Player',
      'Downloads',
      'Profile + settings',
    ],
  },
  notion: {
    tagline: 'Notion UI blueprint — build a block-based productivity app',
    blurb:
      'A complete spec of the Notion iOS app — workspace switcher, page tree, block editor, databases, templates — with every toggle, slash menu, and drag handle documented.',
    pitch:
      'The ultimate reference for any docs, notes, or workspace app. Captures the unique block-based editing paradigm that makes Notion feel infinitely flexible.',
    keywords: [
      'notion clone',
      'productivity app template',
      'notion ui kit',
      'block editor app design',
      'build a notion clone',
    ],
    sector: 'Productivity & notes',
    screens: [
      'Workspace + sidebar',
      'Page + blocks',
      'Database views',
      'Templates',
      'Search',
      'Settings + account',
    ],
  },
  pinterest: {
    tagline: 'Pinterest design blueprint — build a visual discovery app',
    blurb:
      'A full spec of the Pinterest iOS app — masonry grid, pin detail, boards, search, create pin — captured with exact grid spacing and save-button interactions.',
    pitch:
      'The blueprint for any visual-discovery, mood-board, or inspiration app. Every double-column layout, save animation, and related-pin rail is documented.',
    keywords: [
      'pinterest clone',
      'visual discovery app template',
      'pinterest ui kit',
      'masonry grid app',
      'build a pinterest clone',
    ],
    sector: 'Visual discovery',
    screens: [
      'Home feed (masonry)',
      'Pin detail',
      'Boards',
      'Search + discover',
      'Create pin',
      'Profile',
    ],
  },
  reddit: {
    tagline: 'Reddit UI blueprint — build a community forum app',
    blurb:
      'The Reddit iOS app documented screen by screen — home, popular, communities, post detail, comments, inbox — with exact karma pills, flair chips, and threaded-comment indentation.',
    pitch:
      'The reference for any forum, discussion, or link-aggregator app. Captures the dense threaded-comment tree that Reddit uniquely gets right.',
    keywords: [
      'reddit clone',
      'forum app template',
      'reddit ui kit',
      'community app design',
      'build a reddit clone',
    ],
    sector: 'Forums & community',
    screens: [
      'Home + popular',
      'Community',
      'Post detail',
      'Comment thread',
      'Inbox',
      'Profile',
    ],
  },
  slack: {
    tagline: 'Slack design blueprint — build a team messaging app',
    blurb:
      'A complete spec of Slack on iOS — workspace sidebar, channels, threads, DMs, huddles, search — with exact spacing, unread indicators, and reaction pickers.',
    pitch:
      'The canonical blueprint for any team-messaging, workplace-chat, or collaboration app. Every channel prefix, mention highlight, and thread sidebar is documented.',
    keywords: [
      'slack clone',
      'team messaging app template',
      'slack ui kit',
      'workplace chat app',
      'build a slack clone',
    ],
    sector: 'Team messaging',
    screens: [
      'Workspace + channels',
      'Channel',
      'Thread',
      'Direct messages',
      'Huddle',
      'Search + profile',
    ],
  },
  snapchat: {
    tagline: 'Snapchat UI blueprint — build an ephemeral messaging app',
    blurb:
      'A full spec of Snapchat on iOS — camera-first capture, chats, stories, Spotlight, map, memories — with every gesture, filter carousel, and snap bubble documented.',
    pitch:
      'The reference blueprint for any camera-first, ephemeral-messaging, or AR-lens app. Captures the camera-as-home-screen paradigm Snapchat pioneered.',
    keywords: [
      'snapchat clone',
      'ephemeral messaging app template',
      'snapchat ui kit',
      'camera app design',
      'build a snapchat clone',
    ],
    sector: 'Messaging & camera',
    screens: [
      'Camera',
      'Chats',
      'Stories',
      'Spotlight',
      'Snap Map',
      'Memories + profile',
    ],
  },
  spotify: {
    tagline: 'Spotify design blueprint — build a music streaming app',
    blurb:
      'A complete spec of the Spotify iOS app — home, search, library, now playing, playlist detail — with the exact green accent, dark-mode palette, and type scale.',
    pitch:
      'Use this as the foundation for a music, podcast, or audio app. The blueprint includes every mini-player state, offline indicator, and queue interaction.',
    keywords: [
      'spotify clone',
      'spotify ui kit',
      'music streaming app template',
      'react native music player',
      'build a spotify clone',
    ],
    sector: 'Music & audio',
    screens: [
      'Home',
      'Search',
      'Library',
      'Now playing',
      'Playlist detail',
      'Mini-player + queue',
    ],
  },
  starbucks: {
    tagline: 'Starbucks UI blueprint — build a loyalty + mobile-order app',
    blurb:
      'The Starbucks iOS app captured end to end — home, order, rewards, scan + pay, stores — with exact typography, generous spacing, and signature green accents.',
    pitch:
      'The blueprint for any retail-loyalty, mobile-order, or QSR app. Every star-ledger row, menu modifier, and payment barcode is documented.',
    keywords: [
      'starbucks clone',
      'loyalty app template',
      'starbucks ui kit',
      'mobile order app design',
      'build a starbucks clone',
    ],
    sector: 'Retail & loyalty',
    screens: [
      'Home',
      'Order + menu',
      'Customize drink',
      'Rewards',
      'Scan + pay',
      'Stores + profile',
    ],
  },
  telegram: {
    tagline: 'Telegram design blueprint — build a messaging app with channels',
    blurb:
      'A full spec of Telegram on iOS — chats, channels, groups, calls, media viewer, settings — with every sticker panel, reply preview, and scheduled-message UI documented.',
    pitch:
      'The reference blueprint for any messaging, channels, or broadcast-style app. Captures the exceptionally polished motion and density Telegram is known for.',
    keywords: [
      'telegram clone',
      'messaging app template',
      'telegram ui kit',
      'channels app design',
      'build a telegram clone',
    ],
    sector: 'Messaging',
    screens: [
      'Chat list',
      'Chat',
      'Channel',
      'Calls',
      'Media viewer',
      'Settings',
    ],
  },
  threads: {
    tagline: 'Threads UI blueprint — build a text-first social app',
    blurb:
      'A complete spec of the Threads iOS app — feed, composer, thread detail, search, activity, profile — with exact monochrome styling and reply-tree indentation.',
    pitch:
      'The cleanest blueprint for any text-first, microblogging, or social-posting app. Every inline-media preview, repost glyph, and quote-post card is documented.',
    keywords: [
      'threads clone',
      'text social app template',
      'threads ui kit',
      'microblogging app design',
      'build a threads clone',
    ],
    sector: 'Social & microblogging',
    screens: [
      'Feed',
      'Composer',
      'Thread detail',
      'Search',
      'Activity',
      'Profile',
    ],
  },
  tiktok: {
    tagline: 'TikTok UI blueprint — build a short-form video app',
    blurb:
      'A full spec of the TikTok iOS app — For You feed, camera capture, effects tray, comments, profile — with every gesture, overlay, and bottom-sheet interaction documented.',
    pitch:
      'The definitive reference for any short-form video or livestreaming app. Includes full-bleed video layouts, reactive action rails, and a tab-bar that dims with the feed.',
    keywords: [
      'tiktok clone',
      'short video app template',
      'tiktok ui kit',
      'react native video app',
      'build a tiktok clone',
    ],
    sector: 'Short-form video',
    screens: [
      'For You feed',
      'Camera + effects',
      'Comments sheet',
      'Profile',
      'Inbox',
      'Discover + search',
    ],
  },
  tinder: {
    tagline: 'Tinder design blueprint — build a swipe-based dating app',
    blurb:
      'A complete spec of Tinder on iOS — card deck swiping, match screen, chat, profile, preferences — with exact gradients, gesture thresholds, and match-celebration motion.',
    pitch:
      'The canonical blueprint for any swipe-card, dating, or matching app. Every undo tap, super-like overlay, and passport flag is documented.',
    keywords: [
      'tinder clone',
      'dating app template',
      'tinder ui kit',
      'swipe card app design',
      'build a tinder clone',
    ],
    sector: 'Dating & social',
    screens: [
      'Card deck',
      'Match screen',
      'Chat',
      'Profile',
      'Preferences',
      'Subscription',
    ],
  },
  uber: {
    tagline: 'Uber design blueprint — build a ride-hailing app',
    blurb:
      'A complete spec of the Uber iOS app — home with live map, product picker, fare summary, driver tracking, post-trip rating — reverse-engineered end to end.',
    pitch:
      'Use this blueprint for any ride-hailing, delivery, or on-demand service app. Every map annotation, bottom sheet, and pickup-confirmation screen is documented.',
    keywords: [
      'uber clone',
      'ride hailing app template',
      'uber ui kit',
      'react native maps app',
      'build an uber clone',
    ],
    sector: 'Transportation & on-demand',
    screens: [
      'Home with live map',
      'Product picker',
      'Fare summary',
      'Pickup confirmation',
      'Driver tracking',
      'Trip summary + rating',
    ],
  },
  venmo: {
    tagline: 'Venmo UI blueprint — build a peer-to-peer payments app',
    blurb:
      'A full spec of Venmo on iOS — social feed, pay + request, scan, cards, crypto — with every transaction row, emoji reaction, and balance card documented.',
    pitch:
      'The reference blueprint for any P2P-payments, fintech-social, or wallet app. Captures the unusual mix of payments with a social feed that made Venmo iconic.',
    keywords: [
      'venmo clone',
      'p2p payments app template',
      'venmo ui kit',
      'fintech app design',
      'build a venmo clone',
    ],
    sector: 'Fintech & payments',
    screens: [
      'Social feed',
      'Pay + request',
      'Scan',
      'Cards',
      'Crypto',
      'Profile + settings',
    ],
  },
  whatsapp: {
    tagline: 'WhatsApp design blueprint — build a messaging app',
    blurb:
      'The WhatsApp iOS app documented in full — chats, calls, status, communities, media viewer — with exact bubble styling, read receipts, and voice-note waveforms.',
    pitch:
      'The reference blueprint for any messaging, calling, or groups app. Captures the minimal, chat-first surface that makes WhatsApp feel universally familiar.',
    keywords: [
      'whatsapp clone',
      'messaging app template',
      'whatsapp ui kit',
      'react native chat app',
      'build a whatsapp clone',
    ],
    sector: 'Messaging',
    screens: [
      'Chats',
      'Chat',
      'Calls',
      'Status',
      'Communities',
      'Settings',
    ],
  },
  'x-twitter': {
    tagline: 'X (Twitter) UI blueprint — build a real-time social feed app',
    blurb:
      'A complete spec of X / Twitter on iOS — timeline, tweet detail, compose, explore, spaces, profile — with every verified glyph, quote-card, and trend module captured.',
    pitch:
      'The canonical blueprint for any real-time, microblogging, or news-feed app. Every thread connector, media carousel, and reply composer is documented.',
    keywords: [
      'x clone',
      'twitter clone',
      'microblogging app template',
      'twitter ui kit',
      'build a twitter clone',
    ],
    sector: 'Social & microblogging',
    screens: [
      'Timeline',
      'Tweet detail',
      'Compose',
      'Explore',
      'Spaces',
      'Profile',
    ],
  },
  youtube: {
    tagline: 'YouTube design blueprint — build a video platform app',
    blurb:
      'A full spec of the YouTube iOS app — home, Shorts, subscriptions, watch page, comments, library — with exact player controls, chapter markers, and subscribe buttons documented.',
    pitch:
      'The definitive blueprint for any long-form video, creator, or streaming app. Covers the mini-player swipe, Shorts rail, and comment-tree at pixel fidelity.',
    keywords: [
      'youtube clone',
      'video app template',
      'youtube ui kit',
      'react native video player',
      'build a youtube clone',
    ],
    sector: 'Video & streaming',
    screens: [
      'Home',
      'Shorts',
      'Watch page',
      'Comments',
      'Subscriptions',
      'Library',
    ],
  },
}

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return [
    ...APPS.map((slug) => ({ slug })),
    ...CATEGORIES.map((slug) => ({ slug })),
  ]
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  if (isCategorySlug(params.slug)) {
    const label = CATEGORY_LABELS[params.slug]
    const apps = CATEGORY_APPS[params.slug]
    const appsList = apps.map((s) => TITLES[s]).join(', ')
    const title = `${label} iOS design blueprints — Spectr gallery`
    const description = `${apps.length} ${label.toLowerCase()} app design blueprints: ${appsList}. Tap a phone to open the live preview.`
    return {
      title,
      description,
      alternates: { canonical: `/gallery/${params.slug}` },
      openGraph: {
        type: 'website',
        title,
        description,
        url: `${SITE_URL}/gallery/${params.slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    }
  }
  if (!isAppSlug(params.slug)) {
    return { title: 'Gallery', robots: { index: false, follow: false } }
  }
  const name = TITLES[params.slug]
  const copy = APP_COPY[params.slug]
  const title = `${name} UI blueprint — design spec to clone ${name}`
  const description = copy.blurb
  return {
    title,
    description,
    keywords: copy.keywords,
    alternates: { canonical: `/gallery/${params.slug}` },
    openGraph: {
      type: 'article',
      title: `${name} design blueprint — Spectr`,
      description,
      url: `${SITE_URL}/gallery/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} design blueprint — Spectr`,
      description,
    },
  }
}

export default async function GalleryAppPage({ params }: { params: Params }) {
  if (isCategorySlug(params.slug)) {
    return <CategoryView category={params.slug} />
  }
  if (!isAppSlug(params.slug)) notFound()
  const slug: AppSlug = params.slug
  const name = TITLES[slug]
  const copy = APP_COPY[slug]
  const doc = await fetchPhone(slug)
  const specUrl = specGithubUrl(slug)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `${name} UI Blueprint`,
    headline: `${name} design blueprint`,
    description: copy.blurb,
    url: `${SITE_URL}/gallery/${slug}`,
    about: {
      '@type': 'MobileApplication',
      name,
      applicationCategory: copy.sector,
    },
    keywords: copy.keywords.join(', '),
    creator: { '@type': 'Organization', name: 'Spectr', url: SITE_URL },
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'Spectr Gallery',
      url: `${SITE_URL}/`,
    },
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Gallery', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}/gallery/${slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .ga-page {
          position: relative;
          min-height: 100dvh;
          overflow-x: clip;
          background: radial-gradient(ellipse 180% 100% at 50% -20%,
            #0d0e18 0%, #07080f 40%, #010102 100%);
          padding: 0 24px 96px;
        }
        .ga-below {
          position: relative;
          z-index: 3;
          max-width: 720px;
          margin: 0 auto;
          padding: 24px 24px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          font-size: 13px;
        }
        .ga-link {
          color: rgba(200,210,255,0.75);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.2s ease;
        }
        .ga-link:hover { color: #e8ebff; }

        .ga-content {
          position: relative;
          z-index: 3;
          max-width: 880px;
          margin: 0 auto;
          padding: 40px 8px 0;
        }
        .ga-content h2 {
          font-size: clamp(26px, 3vw, 36px);
          font-weight: 520;
          letter-spacing: -0.02em;
          color: #f3f4fb;
          margin: 0 0 14px;
        }
        .ga-content h3 {
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(170,180,220,0.85);
          margin: 0 0 8px;
        }
        .ga-content p {
          font-size: 15px;
          line-height: 1.6;
          color: rgba(208,214,228,0.78);
          margin: 0 0 16px;
          max-width: 64ch;
        }
        .ga-topback {
          position: relative;
          z-index: 4;
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 8px 0;
        }
        .ga-topback a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: rgba(200,210,240,0.7);
          text-decoration: none;
          transition: color 0.18s ease;
        }
        .ga-topback a:hover { color: #fff; }
        .ga-topback .arr { font-size: 14px; line-height: 1; }
        .ga-sector {
          display: inline-block;
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(160,170,255,0.75);
          margin-bottom: 12px;
        }
        .ga-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin: 22px 0 32px;
        }
        @media (min-width: 720px) {
          .ga-grid { grid-template-columns: 1fr 1fr; }
        }
        .ga-card {
          padding: 18px 20px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .ga-card p {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(208,214,228,0.72);
          margin: 0;
        }
        .ga-screens {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        @media (min-width: 560px) {
          .ga-screens { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 960px) {
          .ga-screens { grid-template-columns: 1fr 1fr 1fr; }
        }
        .ga-screens li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: rgba(216,222,236,0.82);
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .ga-screens li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #a88bff;
          box-shadow: 0 0 12px rgba(168,139,255,0.55);
          flex-shrink: 0;
        }
        .ga-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 28px;
        }
        .ga-cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 20px; border-radius: 10px;
          background: linear-gradient(135deg, #7a6cff 0%, #a88bff 100%);
          color: #0a0b14; font-weight: 600; font-size: 14px;
          text-decoration: none;
          border: 0; cursor: pointer;
          font-family: inherit;
          box-shadow: 0 8px 24px rgba(113,112,255,0.35);
          transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .ga-cta-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(113,112,255,0.42);
        }
        .ga-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 20px; border-radius: 10px;
          color: #e8ebff; font-weight: 500; font-size: 14px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.02);
          font-family: inherit;
          cursor: pointer;
        }
        .ga-cta-ghost:hover { background: rgba(255,255,255,0.06); }
      `}} />

      <main className="ga-page">
        <SpectrBackground />

        <div className="ga-topback">
          <Link href="/gallery" prefetch={false}>
            <span className="arr">←</span> Back to Gallery
          </Link>
        </div>

        <HeroPhone
          doc={doc ?? ''}
          name={name}
          eyebrow={`Gallery · ${name}`}
          title={name}
          subtitle={`A design blueprint Spectr produced from ${name}. Scroll to look closer.`}
        />

        <section className="ga-content">
          <div className="ga-sector">{copy.sector}</div>
          <h2>{copy.tagline}</h2>
          <p>{copy.blurb}</p>
          <p>{copy.pitch}</p>

          <div className="ga-ctas">
            <Link href="/" className="ga-cta-primary">
              Generate your own with the MCP ↗
            </Link>
            <a
              href={specUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ga-cta-ghost"
            >
              View full {name} spec on GitHub ↗
            </a>
          </div>

          <h3>Screens documented</h3>
          <ul className="ga-screens">
            {copy.screens.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          <div className="ga-grid">
            <div className="ga-card">
              <h3>What a Spectr spec includes</h3>
              <p>
                Screen-by-screen documentation, complete design system (color, typography,
                spacing), navigation map, component library, implementation notes, and a Claude
                Code prompt — everything an AI coding agent needs to build.
              </p>
            </div>
            <div className="ga-card">
              <h3>Turnaround</h3>
              <p>
                Most mobile apps produce a full spec in under 90 seconds from a single screen
                recording. Upload your own MP4 and watch the blueprint generate live.
              </p>
            </div>
            <div className="ga-card">
              <h3>Why not a design file?</h3>
              <p>
                Design files don&apos;t compile. A Spectr spec is optimized for AI coding agents
                like Claude Code — it produces working code on the first prompt, not layered
                artboards.
              </p>
            </div>
            <div className="ga-card">
              <h3>Target stack</h3>
              <p>
                Every spec targets Expo SDK 54 and React Native on an iPhone 15 baseline.
                The {name} blueprint translates cleanly into an Expo Router app structure.
              </p>
            </div>
          </div>
        </section>

        <nav className="ga-below">
          <Link href="/gallery" className="ga-link" prefetch={false}>
            ← Back to gallery
          </Link>
          <a
            href={specUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ga-link"
          >
            View spec on GitHub ↗
          </a>
        </nav>
      </main>
    </>
  )
}
