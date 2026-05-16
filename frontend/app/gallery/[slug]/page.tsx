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
  'apple-maps': {
    tagline: 'Apple Maps design blueprint — build a native-feel mapping app',
    blurb:
      'A full spec of the Apple Maps iOS app — search, directions, transit, lookaround, and the sliding bottom card — captured with the exact cream parchment cartography and HIG-correct system blue at every interaction.',
    pitch:
      'The starting point for any maps, navigation, or location-aware app that wants to feel native to iOS. Covers the search card detents, route polyline, and pulsing current-location puck at pixel fidelity.',
    keywords: [
      'apple maps clone',
      'mapping app template',
      'ios navigation app design',
      'react native maps ui kit',
      'build a maps app',
    ],
    sector: 'Maps & navigation',
    screens: [
      'Map + search card',
      'Search results',
      'Place detail',
      'Directions overview',
      'Turn-by-turn',
      'Saved + Guides',
    ],
  },
  'apple-notes': {
    tagline: 'Apple Notes design blueprint — build a calm, paper-warm note app',
    blurb:
      'A complete spec of the Apple Notes iOS app — note list, editor, folder hierarchy, tags, pinned notes — with the warm cream canvas, orange folder strokes, and SF Pro hierarchy intact.',
    pitch:
      'A reference blueprint for any minimalist note-taking, journaling, or writing app. Every list row, swipe action, and inline formatting toolbar is documented with exact spacing and type metrics.',
    keywords: [
      'apple notes clone',
      'note taking app template',
      'minimalist writing app design',
      'react native notes ui kit',
      'build a note app',
    ],
    sector: 'Productivity & notes',
    screens: [
      'Notes list',
      'Note editor',
      'Folders + pinned',
      'Tag browse',
      'Search',
      'Sharing + lock',
    ],
  },
  'apple-wallet': {
    tagline: 'Apple Wallet design blueprint — build a premium card-stack app',
    blurb:
      'A full spec of the Apple Wallet iOS app — the iconic peek-stack card view, card detail, transaction list, and Apple Card titanium gradient — captured down to envelope corner radii and stack offsets.',
    pitch:
      'The reference for any wallet, loyalty, ticketing, or pass-management app. The stacked-card metaphor, gesture-driven expand/collapse, and per-card chrome are all documented for clean reuse.',
    keywords: [
      'apple wallet clone',
      'wallet app template',
      'card stack ui pattern',
      'loyalty pass app design',
      'build a wallet app',
    ],
    sector: 'Wallet & passes',
    screens: [
      'Card stack',
      'Card detail',
      'Transaction list',
      'Add card flow',
      'Apple Pay sheet',
      'Settings + sharing',
    ],
  },
  bumble: {
    tagline: 'Bumble design blueprint — build a women-first dating app',
    blurb:
      'A complete spec of the Bumble iOS app — swipe deck, hexagon match notification, profile builder, the 24-hour countdown chip — captured with the saturated Bumble Yellow, hexagon iconography, and confident Brando weights.',
    pitch:
      'The starting blueprint for any swipe-deck dating, friendship, or networking app. Every gesture, animation, and gating mechanic (24-hour reply window) is documented.',
    keywords: [
      'bumble clone',
      'dating app template',
      'swipe deck ui kit',
      'react native dating app',
      'build a bumble clone',
    ],
    sector: 'Dating & social',
    screens: [
      'Swipe deck',
      'Profile detail',
      'Match notification',
      'Conversations',
      'Profile builder',
      'Filters + settings',
    ],
  },
  'cash-app': {
    tagline: 'Cash App design blueprint — build a stark money-movement app',
    blurb:
      'A full spec of the Cash App iOS app — the giant $-amount keypad, icon-only tab bar, Cash Card, Investing, Bitcoin — captured with the pure-black canvas and single Cash Green accent intact.',
    pitch:
      'The reference blueprint for any peer-to-peer payments, neobank, or money-movement app. The 96pt amount entry, $cashtag handles, and tabbed money/card/pay/activity/invest pattern are all documented.',
    keywords: [
      'cash app clone',
      'p2p payments template',
      'neobank ui kit',
      'react native fintech',
      'build a cash app clone',
    ],
    sector: 'Payments & banking',
    screens: [
      'Money + keypad',
      'Cash Card',
      'Pay / Request',
      'Activity feed',
      'Investing',
      'Bitcoin',
    ],
  },
  claude: {
    tagline: 'Claude design blueprint — build a warm AI chat app',
    blurb:
      'A complete spec of the Claude iOS app — chat thread, artifact tray, projects, the asterisk-star mark — captured with the cream paper canvas, Claude Orange terracotta, and Tiempos serif body that defines the brand.',
    pitch:
      'A starting blueprint for any AI assistant, writing-companion, or document-grounded chat app. Streaming cursor, artifact tray, code blocks, and warm-dark mode are all documented.',
    keywords: [
      'claude clone',
      'ai chat app template',
      'llm chat ui kit',
      'react native ai assistant',
      'build a claude clone',
    ],
    sector: 'AI & assistants',
    screens: [
      'Chat thread',
      'New conversation',
      'Artifact tray',
      'Projects',
      'History',
      'Settings',
    ],
  },
  coinbase: {
    tagline: 'Coinbase design blueprint — build a clean crypto exchange app',
    blurb:
      'A full spec of the Coinbase iOS app — portfolio, asset detail with sparkline, buy/sell/send/receive quad, market list — captured with Coinbase Blue, the brand-color asset icons, and Coinbase Sans/Display/Mono.',
    pitch:
      'The blueprint for any crypto exchange, brokerage, or portfolio-tracking app. Every asset row, mini sparkline, and 4-up action quad is documented at pixel fidelity.',
    keywords: [
      'coinbase clone',
      'crypto exchange template',
      'portfolio app ui kit',
      'react native crypto',
      'build a coinbase clone',
    ],
    sector: 'Crypto & investing',
    screens: [
      'Portfolio',
      'Asset detail + chart',
      'Buy / Sell',
      'Send / Receive',
      'Market list',
      'Account + earn',
    ],
  },
  figma: {
    tagline: 'Figma design blueprint — build a companion design-collab app',
    blurb:
      'A full spec of the Figma iOS app — file browser, project list, comments, version history — captured with the five iconic brand cubes, Action Blue, Inter at 11–16pt density, and the dark canvas that matches the Editor.',
    pitch:
      'A starting blueprint for any design-collaboration, file-viewer, or design-system-companion app. Cursor sharing, comment threads, and the brand-cube visual identity are all documented.',
    keywords: [
      'figma clone',
      'design collab template',
      'design system viewer ui kit',
      'react native design tool',
      'build a figma clone',
    ],
    sector: 'Design & collaboration',
    screens: [
      'File browser',
      'Recents + drafts',
      'File preview',
      'Comments',
      'Version history',
      'Profile + teams',
    ],
  },
  'google-calendar': {
    tagline: 'Google Calendar design blueprint — build a Material calendar app',
    blurb:
      'A full spec of the Google Calendar iOS app — Schedule view, Month view, Day view, event detail, the FAB-driven create flow — captured with the Material primaries, 24-color event palette, and Google Sans + SF Pro hybrid stack.',
    pitch:
      'The blueprint for any scheduling, calendar, or event-management app. Material on iOS done right — FAB elevation, the today-pill, swipeable views, and category-colored events at pixel fidelity.',
    keywords: [
      'google calendar clone',
      'calendar app template',
      'scheduling app ui kit',
      'react native calendar',
      'build a calendar app',
    ],
    sector: 'Calendar & scheduling',
    screens: [
      'Schedule view',
      'Month view',
      'Day view',
      'Event detail',
      'Create event',
      'Settings + calendars',
    ],
  },
  headspace: {
    tagline: 'Headspace design blueprint — build a warm meditation + sleep app',
    blurb:
      'A complete spec of the Headspace iOS app — Today screen, meditation player with the breathing sphere, Sleep tab with Sage tint, course detail — captured with the butter-cream canvas and Marigold + Aurora gradient wash.',
    pitch:
      'The starting blueprint for any meditation, wellness, sleep, or guided-audio app. The 234pt breathing sphere on a 12s cycle, illustrative tile system, and title-case typography are all documented.',
    keywords: [
      'headspace clone',
      'meditation app template',
      'wellness app ui kit',
      'react native sleep app',
      'build a meditation app',
    ],
    sector: 'Health & wellness',
    screens: [
      'Today',
      'Meditate library',
      'Player + breathing sphere',
      'Sleep tab',
      'Course detail',
      'Profile + streaks',
    ],
  },
  hinge: {
    tagline: 'Hinge design blueprint — build a relationship-intent dating app',
    blurb:
      'A complete spec of the Hinge iOS app — vertical-scroll profile, prompt cards in Sailec Bold, the 44pt heart-tap on every reactive surface, Rose Gold for Standouts and Roses — captured on the warm cream paper canvas.',
    pitch:
      'A blueprint for any vertical-profile dating, relationship, or community app. The like-with-a-comment pattern, prompt cards, and serious editorial typographic hierarchy are all documented.',
    keywords: [
      'hinge clone',
      'dating app template',
      'profile-first dating ui kit',
      'react native dating app',
      'build a hinge clone',
    ],
    sector: 'Dating & social',
    screens: [
      'Discover stack',
      'Profile detail',
      'Likes received',
      'Match modal',
      'Conversations',
      'Profile editor',
    ],
  },
  myfitnesspal: {
    tagline: 'MyFitnessPal design blueprint — build a clinical calorie + macro app',
    blurb:
      'A full spec of the MyFitnessPal iOS app — diary, calorie ring, macro trio, barcode scan, food search — captured with the MFP Blue heritage palette, locked macro colors, and color-flipping calorie ring.',
    pitch:
      'A starting blueprint for any calorie-tracking, macro-counting, nutrition, or meal-logging app. The 220pt ring that color-flips by state and the locked Carbs/Fat/Protein trio are documented in full.',
    keywords: [
      'myfitnesspal clone',
      'calorie tracker template',
      'nutrition app ui kit',
      'react native fitness',
      'build a calorie tracking app',
    ],
    sector: 'Health & wellness',
    screens: [
      'Dashboard',
      'Diary',
      'Quick log',
      'Food search',
      'Barcode scan',
      'Progress + plans',
    ],
  },
  'nike-run-club': {
    tagline: 'Nike Run Club design blueprint — build a bold run-coaching app',
    blurb:
      'A full spec of the Nike Run Club iOS app — run tracking, guided runs, achievement medals, the 280pt progress ring on Volt — captured with the true-black canvas, Trade Gothic Heavy Condensed type, and hexagonal medal language.',
    pitch:
      'The blueprint for any running, cycling, or activity-coaching app. Big bold confident type, voice-coached sessions, hexagonal achievements, and a heavy-haptic START RUN are all documented.',
    keywords: [
      'nike run club clone',
      'running app template',
      'fitness tracking ui kit',
      'react native run app',
      'build a running app',
    ],
    sector: 'Fitness & activity',
    screens: [
      'Run today',
      'Run-in-progress',
      'Run summary',
      'Guided runs',
      'Achievements',
      'Profile + activity',
    ],
  },
  paypal: {
    tagline: 'PayPal design blueprint — build a trusted institutional fintech app',
    blurb:
      'A complete spec of the PayPal iOS app — wallet balance card, send/request flow, transaction list, the dual-blue P-P wordmark — captured with PayPal Sans Big/Small and the soft-pill CTA pattern.',
    pitch:
      'The starting point for any wallet, peer payments, or fintech app that needs to feel institutional and trustworthy. The balance-anchor pattern and color-coded activity icons are all documented.',
    keywords: [
      'paypal clone',
      'fintech app template',
      'wallet app ui kit',
      'react native payments',
      'build a paypal clone',
    ],
    sector: 'Payments & banking',
    screens: [
      'Wallet + balance',
      'Send money',
      'Request money',
      'Activity feed',
      'Transaction detail',
      'Profile + settings',
    ],
  },
  perplexity: {
    tagline: 'Perplexity design blueprint — build an answer engine with citations',
    blurb:
      'A complete spec of the Perplexity iOS app — search input, the cited answer surface, source card row, follow-up suggestions, library — captured with the dark canvas and the brand-defining inline citation chips.',
    pitch:
      'A blueprint for any AI answer engine, research assistant, or citation-grounded search app. The inline `[1][2][3]` chips, horizontal source-card row, and FK Grotesk + Inter encyclopedic register are all documented.',
    keywords: [
      'perplexity clone',
      'ai search template',
      'research assistant ui kit',
      'react native ai search',
      'build a perplexity clone',
    ],
    sector: 'AI & search',
    screens: [
      'New search',
      'Answer + citations',
      'Source list',
      'Follow-up suggestions',
      'Library',
      'Profile + spaces',
    ],
  },
  robinhood: {
    tagline: 'Robinhood design blueprint — build a clean investing app',
    blurb:
      'A full spec of the Robinhood iOS app — portfolio with the draggable chart scrubber, asset detail, watchlist, buy/sell flow — captured with the green-up / orange-down chart language and Capsule Sans Text tabular numerals.',
    pitch:
      'The blueprint for any brokerage, stock, ETF, or investing app. The portfolio chart scrubber, asset rows, options chains, and Cards/Account flow are all documented at pixel fidelity.',
    keywords: [
      'robinhood clone',
      'investing app template',
      'brokerage ui kit',
      'react native stocks',
      'build an investing app',
    ],
    sector: 'Investing & brokerage',
    screens: [
      'Portfolio + chart',
      'Asset detail',
      'Buy / Sell',
      'Watchlist',
      'Search + discover',
      'Account + cash',
    ],
  },
  strava: {
    tagline: 'Strava design blueprint — build a social activity-tracking app',
    blurb:
      'A complete spec of the Strava iOS app — activity feed with route maps, kudos, segment leaderboards, record button, post-activity summary — captured with the Strava Orange single-accent system and tabular-numeral stat grids.',
    pitch:
      'The blueprint for any activity-tracking, fitness-social, or sport-community app. Route polylines, the 3-up DISTANCE/TIME/PACE grid, and the segment leaderboard pattern are all documented.',
    keywords: [
      'strava clone',
      'activity tracking template',
      'fitness social ui kit',
      'react native run cycle',
      'build a strava clone',
    ],
    sector: 'Fitness & activity',
    screens: [
      'Activity feed',
      'Record',
      'Activity detail',
      'Segment leaderboard',
      'Maps + routes',
      'Profile + training',
    ],
  },
  todoist: {
    tagline: 'Todoist design blueprint — build a fast tasks + projects app',
    blurb:
      'A full spec of the Todoist iOS app — Inbox, Today, Upcoming, projects sidebar, quick-add with smart parsing, four-tier priority — captured with the Todoist Red brand and the tinted-red FAB shadow.',
    pitch:
      'The blueprint for any task-management, to-do, or project-tracking app. Natural-language quick-add, edge-to-edge task rows, swipe complete/postpone, and the priority hierarchy are all documented.',
    keywords: [
      'todoist clone',
      'todo app template',
      'task management ui kit',
      'react native productivity',
      'build a todoist clone',
    ],
    sector: 'Productivity & tasks',
    screens: [
      'Inbox',
      'Today / Upcoming',
      'Project detail',
      'Quick add',
      'Task detail',
      'Labels + filters',
    ],
  },
  waze: {
    tagline: 'Waze design blueprint — build a community-driven navigation app',
    blurb:
      'A full spec of the Waze iOS app — drive view, hazard reports, route planning, ETA share, the cyan arrow puck — captured with Waze Purple + Cyan, the speech-bubble report tails, and the loud cartoon cartography.',
    pitch:
      'The blueprint for any community-driven navigation, hazard-reporting, or driving app. The chunky speech-bubble report system, cyan arrow puck, and tinted shadows are all documented.',
    keywords: [
      'waze clone',
      'navigation app template',
      'community driving ui kit',
      'react native maps',
      'build a waze clone',
    ],
    sector: 'Maps & navigation',
    screens: [
      'Drive view',
      'Report hazard',
      'Route planning',
      'ETA share',
      'Search destination',
      'Profile + scores',
    ],
  },
  whoop: {
    tagline: 'WHOOP design blueprint — build a cockpit-grade body coach app',
    blurb:
      'A complete spec of the WHOOP iOS app — Strain, Recovery, and Sleep rings, daily overview, journal, the neon-on-pitch-black aesthetic — captured with DIN 2014 ALL CAPS, tabular numerals, and glow-as-elevation.',
    pitch:
      'The blueprint for any biometric, recovery-coaching, sleep-tracking, or athlete-performance app. The Strain/Recovery/Sleep ring trio and the cockpit-grade data-density are all documented.',
    keywords: [
      'whoop clone',
      'biometrics app template',
      'recovery tracking ui kit',
      'react native wearable',
      'build a whoop clone',
    ],
    sector: 'Health & wellness',
    screens: [
      'Overview',
      'Strain detail',
      'Recovery detail',
      'Sleep detail',
      'Journal',
      'Coaching + community',
    ],
  },
  bereal: {
    tagline: 'BeReal UI blueprint — build an authentic dual-camera social app',
    blurb:
      'A complete spec of the BeReal iOS app — the 2-minute capture, dual front+back composite, friends feed, RealMojis, and memories — captured on a stark pure-black canvas with zero vanity metrics.',
    pitch:
      'The reference for any anti-filter, in-the-moment social app. The dual-lens composite card, countdown banner, late tag, and RealMoji reactions are all documented to the pixel.',
    keywords: [
      'bereal clone',
      'dual camera social app',
      'bereal ui kit',
      'react native social template',
      'build a bereal clone',
    ],
    sector: 'Social & community',
    screens: [
      'Dual-camera capture',
      'Friends feed',
      'RealMojis picker',
      'Memories calendar',
      'Discovery',
      'Profile',
    ],
  },
  mastodon: {
    tagline: 'Mastodon design blueprint — build a federated social app',
    blurb:
      'A full spec of the Mastodon iOS app — home/local/federated timelines, the toot composer, content-warning spoilers, and boosts — captured with the purple accent and federated handle system.',
    pitch:
      'The blueprint for any decentralized or open-source social network. Every timeline switch, CW reveal, and boost-with-spin interaction is documented with exact tokens.',
    keywords: [
      'mastodon clone',
      'fediverse app template',
      'mastodon ui kit',
      'decentralized social app',
      'build a mastodon clone',
    ],
    sector: 'Social & community',
    screens: [
      'Home timeline',
      'Local + federated',
      'Toot composer',
      'Thread detail',
      'Notifications',
      'Profile',
    ],
  },
  bluesky: {
    tagline: 'Bluesky UI blueprint — build a custom-feeds social app',
    blurb:
      'A complete spec of the Bluesky iOS app — switchable custom feeds, the skeet composer, reply controls, and the three-theme system — captured with the sky-blue accent and butterfly identity.',
    pitch:
      'The reference for any AT-Proto or feed-algorithm-choice social app. The pinned feed selector, reply-control chips, and light/dim/dark themes are documented in full.',
    keywords: [
      'bluesky clone',
      'at protocol app template',
      'bluesky ui kit',
      'custom feed social app',
      'build a bluesky clone',
    ],
    sector: 'Social & community',
    screens: [
      'Home + custom feeds',
      'Discover feeds',
      'Composer',
      'Thread',
      'Notifications',
      'Profile',
    ],
  },
  nextdoor: {
    tagline: 'Nextdoor design blueprint — build a hyperlocal community app',
    blurb:
      'A full spec of the Nextdoor iOS app — the neighborhood feed, hyperlocal map, verified-neighbor badges, and post composer — captured on a warm cream canvas with the signature green.',
    pitch:
      'The blueprint for any local, neighborhood, or community-commerce app. The map-with-pins view, verified badges, and group chips are documented with exact spacing and color.',
    keywords: [
      'nextdoor clone',
      'neighborhood app template',
      'nextdoor ui kit',
      'hyperlocal community app',
      'build a nextdoor clone',
    ],
    sector: 'Social & community',
    screens: [
      'Neighborhood feed',
      'Hyperlocal map',
      'Post composer',
      'Groups',
      'Notifications',
      'Inbox',
    ],
  },
  tumblr: {
    tagline: 'Tumblr UI blueprint — build a creative blogging social app',
    blurb:
      'A complete spec of the Tumblr iOS app — the infinite dashboard, reblog chains, tag bar, and notes — captured on the deep-navy canvas with the multi-accent brand trio.',
    pitch:
      'The reference for any blogging, fandom, or long-form social app. The reblog-with-comment chain, tag-driven discovery, and notes count are all documented.',
    keywords: [
      'tumblr clone',
      'blogging app template',
      'tumblr ui kit',
      'react native social blog',
      'build a tumblr clone',
    ],
    sector: 'Social & community',
    screens: [
      'Dashboard',
      'Explore + tags',
      'Post composer',
      'Reblog chain',
      'Activity',
      'Blog profile',
    ],
  },
  quora: {
    tagline: 'Quora design blueprint — build a Q&A knowledge app',
    blurb:
      'A full spec of the Quora iOS app — the question feed, upvote/downvote, credentialed answers, and Spaces — captured with the serif-question / sans-answer split and Quora red.',
    pitch:
      'The blueprint for any Q&A, knowledge-sharing, or expert-network app. The voting pills, credential bylines, and Spaces carousel are documented to exact values.',
    keywords: [
      'quora clone',
      'q&a app template',
      'quora ui kit',
      'knowledge sharing app',
      'build a quora clone',
    ],
    sector: 'Social & community',
    screens: ['Home feed', 'Question detail', 'Answer composer', 'Spaces', 'Search', 'Profile'],
  },
  signal: {
    tagline: 'Signal UI blueprint — build a privacy-first messaging app',
    blurb:
      'A complete spec of the Signal iOS app — the chat list, encrypted bubbles, disappearing-message timers, and calls — captured with the single Signal-blue accent and zero-vanity minimalism.',
    pitch:
      'The reference for any encrypted, privacy-focused, or secure-comms app. The bubble system, disappearing timer chip, and sealed-sender glyphs are documented in full.',
    keywords: [
      'signal clone',
      'encrypted messaging template',
      'signal ui kit',
      'private chat app',
      'build a signal clone',
    ],
    sector: 'Messaging',
    screens: ['Chat list', 'Conversation', 'Disappearing messages', 'Calls', 'Stories', 'Settings'],
  },
  messenger: {
    tagline: 'Messenger design blueprint — build a rich chat app',
    blurb:
      'A full spec of the Messenger iOS app — gradient outgoing bubbles, chat-head avatars, the reactions popover, and active dots — captured with the multi-stop brand gradient.',
    pitch:
      'The blueprint for any social-chat or messaging app. The conversation-anchored gradient bubble, 6-emoji reactions, and one-tap-like send are all documented.',
    keywords: [
      'messenger clone',
      'chat app template',
      'messenger ui kit',
      'react native messaging',
      'build a messenger clone',
    ],
    sector: 'Messaging',
    screens: ['Chats', 'Conversation', 'Reactions', 'Active now', 'Stories', 'Profile'],
  },
  line: {
    tagline: 'LINE UI blueprint — build a sticker-first messaging app',
    blurb:
      'A complete spec of the LINE iOS app — oversized stickers, the friends list, official accounts, and the wallet hub — captured on the periwinkle backdrop with LINE green.',
    pitch:
      'The reference for any messaging-plus-platform app. The bubble-less giant stickers, official-account badges, and super-app tabs are documented to exact tokens.',
    keywords: [
      'line clone',
      'sticker chat app template',
      'line ui kit',
      'messaging platform app',
      'build a line clone',
    ],
    sector: 'Messaging',
    screens: ['Home', 'Talk', 'Stickers', 'Official accounts', 'VOOM', 'Wallet'],
  },
  wechat: {
    tagline: 'WeChat design blueprint — build a super-app messaging platform',
    blurb:
      'A full spec of the WeChat iOS app — tailed bubbles, the Discover hub, Moments feed, and Mini-Program grid — captured on the gray system canvas with WeChat green.',
    pitch:
      'The blueprint for any super-app or messaging-commerce platform. The Discover grouped-list hub, Moments feed, and red-packet card are all documented.',
    keywords: [
      'wechat clone',
      'super app template',
      'wechat ui kit',
      'messaging commerce app',
      'build a wechat clone',
    ],
    sector: 'Messaging',
    screens: ['Chats', 'Conversation', 'Discover', 'Moments', 'Contacts', 'Me'],
  },
  soundcloud: {
    tagline: 'SoundCloud UI blueprint — build a creator audio app',
    blurb:
      'A complete spec of the SoundCloud iOS app — the commentable waveform, track feed, reposts, and up-next queue — captured with the SoundCloud-orange accent.',
    pitch:
      'The reference for any music, podcast, or creator-audio app. The waveform scrubber with inline timestamped comments and the repost feed are documented in full.',
    keywords: [
      'soundcloud clone',
      'audio streaming template',
      'soundcloud ui kit',
      'react native music player',
      'build a soundcloud clone',
    ],
    sector: 'Music & audio',
    screens: ['Home', 'Search', 'Waveform player', 'Library', 'Upload', 'Profile'],
  },
  tidal: {
    tagline: 'TIDAL design blueprint — build a hi-fi music app',
    blurb:
      'A full spec of the TIDAL iOS app — square-art tiles, quality-tier badges, the now-playing screen, and mixes — captured on a pure-black canvas with cyan HiFi accents.',
    pitch:
      'The blueprint for any premium or lossless music app. The MASTER/HiFi quality badges and radically flat tonal-elevation layout are documented to exact values.',
    keywords: [
      'tidal clone',
      'hifi music app template',
      'tidal ui kit',
      'lossless streaming app',
      'build a tidal clone',
    ],
    sector: 'Music & audio',
    screens: ['Home', 'Videos', 'Search', 'Now playing', 'My Collection', 'Album detail'],
  },
  shazam: {
    tagline: 'Shazam UI blueprint — build a music-recognition app',
    blurb:
      'A complete spec of the Shazam iOS app — the giant pulsing tap-to-listen button, the result card, and recent shazams — captured on a radial-blue gradient with glass surfaces.',
    pitch:
      'The reference for any audio-recognition or single-action utility app. The concentric pulse rings, result reveal, and library sheet are documented in full.',
    keywords: [
      'shazam clone',
      'music recognition template',
      'shazam ui kit',
      'audio fingerprint app',
      'build a shazam clone',
    ],
    sector: 'Music & audio',
    screens: ['Listen hero', 'Recognizing', 'Result card', 'Recent shazams', 'Library', 'Charts'],
  },
  audible: {
    tagline: 'Audible design blueprint — build an audiobook app',
    blurb:
      'A full spec of the Audible iOS app — the cover hero, the speed-dial + 30s-skip player, chapters, and Captions — captured with the Playfair/Inter pairing on warm charcoal.',
    pitch:
      'The blueprint for any audiobook, spoken-word, or long-form audio app. The progress-ring cover, speed dial, and chapter list are documented to exact values.',
    keywords: [
      'audible clone',
      'audiobook app template',
      'audible ui kit',
      'spoken audio player',
      'build an audible clone',
    ],
    sector: 'Music & audio',
    screens: ['Home', 'Library', 'Player', 'Chapters', 'Discover', 'Profile'],
  },
  'disney-plus': {
    tagline: 'Disney+ UI blueprint — build a premium streaming app',
    blurb:
      'A complete spec of the Disney+ iOS app — the starfield billboard, brand-portal tile row, 16:9 content rails, and hero auto-trailer — captured on the deep space-navy canvas.',
    pitch:
      'The reference for any premium video-streaming app. The brand-portal gateway tiles, glow-and-scale focus language, and watchlist are documented in full.',
    keywords: [
      'disney plus clone',
      'streaming app template',
      'disney+ ui kit',
      'react native video app',
      'build a disney plus clone',
    ],
    sector: 'Video & streaming',
    screens: ['Home billboard', 'Brand portals', 'Details', 'Search', 'Watchlist', 'Downloads'],
  },
  hulu: {
    tagline: 'Hulu design blueprint — build a content-dense streaming app',
    blurb:
      'A full spec of the Hulu iOS app — the electric-green Watch CTA, 16:9 tiles, hub chips, and continue-watching — captured on a near-black canvas with the signature green.',
    pitch:
      'The blueprint for any TV, live-TV, or on-demand streaming app. The green CTA, hub rails, and progress bars are documented to exact tokens.',
    keywords: [
      'hulu clone',
      'streaming app template',
      'hulu ui kit',
      'react native tv app',
      'build a hulu clone',
    ],
    sector: 'Video & streaming',
    screens: ['Home', 'Hubs', 'Details', 'Search', 'My Stuff', 'Account'],
  },
  max: {
    tagline: 'Max UI blueprint — build a prestige streaming app',
    blurb:
      'A complete spec of the Max iOS app — the gradient wordmark, auto-trailer billboard, prestige rows, and profile gate — captured on the deep-purple branded environment.',
    pitch:
      'The reference for any premium or prestige video-streaming app. The gradient hero, crossfade trailer, and content rows are documented in full.',
    keywords: [
      'max clone',
      'hbo max ui kit',
      'streaming app template',
      'react native video app',
      'build a max clone',
    ],
    sector: 'Video & streaming',
    screens: ['Home billboard', 'Series detail', 'Search', 'My List', 'Profiles', 'Downloads'],
  },
  twitch: {
    tagline: 'Twitch design blueprint — build a live-streaming app',
    blurb:
      'A full spec of the Twitch iOS app — live thumbnails with LIVE pills, the stream view with docked chat, channel cards, and emotes — captured with Twitch purple and live red.',
    pitch:
      'The blueprint for any live-streaming, creator, or watch-together app. The chat column, theater overlay, and strict purple/red color split are documented.',
    keywords: [
      'twitch clone',
      'live streaming template',
      'twitch ui kit',
      'react native streaming app',
      'build a twitch clone',
    ],
    sector: 'Video & streaming',
    screens: ['Following', 'Browse', 'Stream + chat', 'Channel', 'Search', 'Profile'],
  },
  'prime-video': {
    tagline: 'Prime Video UI blueprint — build a streaming app with X-Ray',
    blurb:
      'A complete spec of the Prime Video iOS app — the hero billboard, the X-Ray cast overlay, channel rows, and watchlist — captured on Amazon blue-slate navy with Prime blue.',
    pitch:
      'The reference for any video-on-demand or channel-aggregator app. The X-Ray slide-up overlay, hero, and category rows are documented to exact values.',
    keywords: [
      'prime video clone',
      'streaming app template',
      'prime video ui kit',
      'react native video app',
      'build a prime video clone',
    ],
    sector: 'Video & streaming',
    screens: ['Home', 'Store', 'Player + X-Ray', 'Details', 'Find', 'Downloads'],
  },
  'uber-eats': {
    tagline: 'Uber Eats design blueprint — build a food-delivery app',
    blurb:
      'A full spec of the Uber Eats iOS app — photo-first restaurant cards, category pills, the sticky cart bar, and live map tracking — captured on a clean white canvas with the green accent.',
    pitch:
      'The blueprint for any food-delivery, courier, or on-demand marketplace app. The merchant cards, cart bar, and live order map are documented in full.',
    keywords: [
      'uber eats clone',
      'food delivery template',
      'uber eats ui kit',
      'react native delivery app',
      'build an uber eats clone',
    ],
    sector: 'Food & delivery',
    screens: ['Home', 'Browse', 'Restaurant', 'Cart', 'Order tracking', 'Account'],
  },
  instacart: {
    tagline: 'Instacart UI blueprint — build a grocery-delivery app',
    blurb:
      'A complete spec of the Instacart iOS app — store cards, aisle browse, the qty stepper, replacement preferences, and the green cart bar — captured with Instacart green and carrot orange.',
    pitch:
      'The reference for any grocery, retail-delivery, or shopper-marketplace app. The − n + stepper, replacement flow, and store rows are documented to exact tokens.',
    keywords: [
      'instacart clone',
      'grocery delivery template',
      'instacart ui kit',
      'react native shopping app',
      'build an instacart clone',
    ],
    sector: 'Food & delivery',
    screens: ['Stores', 'Aisle browse', 'Item detail', 'Cart', 'Replacements', 'Account'],
  },
  chipotle: {
    tagline: 'Chipotle design blueprint — build a QSR ordering app',
    blurb:
      'A full spec of the Chipotle iOS app — the build-your-burrito ingredient stepper, foil-texture hero, ALL-CAPS headers, and rewards ring — captured on a cream kraft canvas.',
    pitch:
      'The blueprint for any quick-service-restaurant or food-customization app. The sectioned ingredient stepper and rewards points ring are documented in full.',
    keywords: [
      'chipotle clone',
      'restaurant ordering template',
      'chipotle ui kit',
      'qsr app design',
      'build a chipotle clone',
    ],
    sector: 'Food & delivery',
    screens: ['Order start', 'Build entrée', 'Customize', 'Bag', 'Rewards', 'Scan'],
  },
  dominos: {
    tagline: "Domino's UI blueprint — build a pizza-ordering app",
    blurb:
      "A complete spec of the Domino's iOS app — the 5-stage pizza tracker, build-your-pizza layout, deal cards, and the domino logo — captured with red action and blue info color logic.",
    pitch:
      'The reference for any food-ordering app with live order status. The pizza-tracker stepper and topping builder are documented to exact values.',
    keywords: [
      'dominos clone',
      'pizza ordering template',
      'dominos ui kit',
      'food tracker app',
      'build a dominos clone',
    ],
    sector: 'Food & delivery',
    screens: ['Order', 'Build pizza', 'Deals', 'Tracker', 'Checkout', 'Account'],
  },
  lyft: {
    tagline: 'Lyft design blueprint — build a ride-hailing app',
    blurb:
      'A full spec of the Lyft iOS app — the full-screen map, pickup pin, very-rounded ride-type selector sheet, and ETA — captured with the single Lyft-pink accent.',
    pitch:
      'The blueprint for any ride-hailing, mobility, or on-demand-transport app. The map-as-hero layout and springy ride-type bottom sheet are documented in full.',
    keywords: [
      'lyft clone',
      'ride hailing template',
      'lyft ui kit',
      'react native rideshare app',
      'build a lyft clone',
    ],
    sector: 'Travel & mobility',
    screens: ['Map + where to', 'Ride types', 'Matching', 'En route', 'Receipt', 'Profile'],
  },
  booking: {
    tagline: 'Booking.com UI blueprint — build a travel-booking app',
    blurb:
      'A complete spec of the Booking.com iOS app — the review-score badge, dense property cards, search form, and Genius banner — captured with the navy/bright-blue split.',
    pitch:
      'The reference for any hotel, stay, or travel-marketplace app. The score badge, filter chips, and map toggle are documented to exact tokens.',
    keywords: [
      'booking.com clone',
      'hotel booking template',
      'booking ui kit',
      'travel marketplace app',
      'build a booking clone',
    ],
    sector: 'Travel & mobility',
    screens: ['Search', 'Results', 'Property detail', 'Map', 'Bookings', 'Profile'],
  },
  tripadvisor: {
    tagline: 'Tripadvisor design blueprint — build a travel-reviews app',
    blurb:
      'A full spec of the Tripadvisor iOS app — the 5-circle bubble rating, place cards with traveler photos, Travelers Choice badges, and the owl — captured with the signature green.',
    pitch:
      'The blueprint for any reviews, places, or travel-discovery app. The bubble rating system and category tiles are documented in full.',
    keywords: [
      'tripadvisor clone',
      'travel reviews template',
      'tripadvisor ui kit',
      'places discovery app',
      'build a tripadvisor clone',
    ],
    sector: 'Travel & mobility',
    screens: ['Explore', 'Search', 'Place detail', 'Reviews', 'Trips', 'Profile'],
  },
  hopper: {
    tagline: 'Hopper UI blueprint — build a price-prediction travel app',
    blurb:
      'A complete spec of the Hopper iOS app — the price-prediction calendar heatmap, watch toggle, fare cards, and the bunny mascot — captured with the Hopper-red accent.',
    pitch:
      'The reference for any flight, hotel, or price-tracking travel app. The buy/wait calendar heatmap and watch-price flow are documented to exact values.',
    keywords: [
      'hopper clone',
      'flight price template',
      'hopper ui kit',
      'travel prediction app',
      'build a hopper clone',
    ],
    sector: 'Travel & mobility',
    screens: ['Home', 'Price calendar', 'Fare detail', 'Watches', 'Trips', 'Profile'],
  },
  flighty: {
    tagline: 'Flighty design blueprint — build a flight-tracking app',
    blurb:
      'A full spec of the Flighty iOS app — the live great-circle flight arc, flight cards with on-time stats, the status bar, and delay timeline — captured on a deep-black aviation canvas.',
    pitch:
      'The blueprint for any flight-tracker, travel-status, or Live-Activity app. The map arc, status semantics, and tabular flight times are documented in full.',
    keywords: [
      'flighty clone',
      'flight tracker template',
      'flighty ui kit',
      'travel status app',
      'build a flighty clone',
    ],
    sector: 'Travel & mobility',
    screens: ['Flights', 'Flight map', 'Flight detail', 'Airport', 'Search', 'Profile'],
  },
  etsy: {
    tagline: 'Etsy UI blueprint — build a handmade-marketplace app',
    blurb:
      'A complete spec of the Etsy iOS app — handmade product cards, the favorite heart, shop banners, and review stars — captured on a warm-cream canvas with Etsy orange.',
    pitch:
      'The reference for any handmade, vintage, or creator-commerce marketplace app. The favorite-heart bounce and shop-front warmth are documented to exact tokens.',
    keywords: [
      'etsy clone',
      'marketplace app template',
      'etsy ui kit',
      'react native shop app',
      'build an etsy clone',
    ],
    sector: 'Shopping & finance',
    screens: ['Home', 'Search', 'Listing detail', 'Shop', 'Favorites', 'Cart'],
  },
  ebay: {
    tagline: 'eBay design blueprint — build an auction marketplace app',
    blurb:
      'A full spec of the eBay iOS app — listing cards with bid/Buy-It-Now badges, the watch heart, condition tags, and the time-left countdown — captured with the four-color identity.',
    pitch:
      'The blueprint for any auction, resale, or C2C-marketplace app. The bid-vs-BIN distinction and countdown timer are documented in full.',
    keywords: [
      'ebay clone',
      'auction app template',
      'ebay ui kit',
      'marketplace app design',
      'build an ebay clone',
    ],
    sector: 'Shopping & finance',
    screens: ['Home', 'Search results', 'Listing detail', 'Watchlist', 'My eBay', 'Selling'],
  },
  walmart: {
    tagline: 'Walmart UI blueprint — build a big-box retail app',
    blurb:
      'A complete spec of the Walmart iOS app — product cards with the Rollback tag, the spark logo, category grid, and pickup/delivery toggle — captured with Walmart blue and spark yellow.',
    pitch:
      'The reference for any retail, grocery, or omnichannel-commerce app. The Rollback price tag and fulfillment toggle are documented to exact values.',
    keywords: [
      'walmart clone',
      'retail app template',
      'walmart ui kit',
      'ecommerce app design',
      'build a walmart clone',
    ],
    sector: 'Shopping & finance',
    screens: ['Shop', 'Category', 'Product detail', 'Cart', 'Services', 'Account'],
  },
  revolut: {
    tagline: 'Revolut design blueprint — build a neobank app',
    blurb:
      'A full spec of the Revolut iOS app — the metal-card hero with sheen, multi-currency tiles, the analytics donut, and transaction rows — captured on a cool near-black canvas.',
    pitch:
      'The blueprint for any neobank, fintech, or multi-currency app. The card carousel, spend analytics, and account switcher are documented in full.',
    keywords: [
      'revolut clone',
      'neobank app template',
      'revolut ui kit',
      'fintech app design',
      'build a revolut clone',
    ],
    sector: 'Shopping & finance',
    screens: ['Home', 'Cards', 'Analytics', 'Invest', 'Crypto', 'Transactions'],
  },
  wise: {
    tagline: 'Wise UI blueprint — build a multi-currency money app',
    blurb:
      'A complete spec of the Wise iOS app — multi-currency balances with flag chips, the transparent fee-breakdown card, the mid-market rate, and the send flow — captured with forest/bright-green.',
    pitch:
      'The reference for any cross-border payments or multi-currency app. The fee-transparency breakdown and send-money stepper are documented to exact tokens.',
    keywords: [
      'wise clone',
      'money transfer template',
      'wise ui kit',
      'fintech transfer app',
      'build a wise clone',
    ],
    sector: 'Shopping & finance',
    screens: ['Home', 'Balances', 'Send money', 'Recipients', 'Card', 'Account'],
  },
  klarna: {
    tagline: 'Klarna design blueprint — build a BNPL shopping app',
    blurb:
      'A full spec of the Klarna iOS app — the pay-in-4 schedule timeline, the in-app shopping browser, soft pink CTAs, and the order list — captured with the Klarna-pink identity.',
    pitch:
      'The blueprint for any buy-now-pay-later, shopping, or installment-finance app. The 4-payment schedule timeline and shopping browser are documented in full.',
    keywords: [
      'klarna clone',
      'bnpl app template',
      'klarna ui kit',
      'installment payment app',
      'build a klarna clone',
    ],
    sector: 'Shopping & finance',
    screens: ['Shop', 'Browser', 'Payment schedule', 'Payments', 'Rewards', 'Profile'],
  },
  trello: {
    tagline: 'Trello UI blueprint — build a kanban project app',
    blurb:
      'A complete spec of the Trello iOS app — horizontal kanban lists, draggable cards with the lift, label color rows, and board backgrounds — captured with the Trello-blue accent.',
    pitch:
      'The reference for any kanban, project-management, or task-board app. The card drag-lift and board-as-canvas layout are documented to exact values.',
    keywords: [
      'trello clone',
      'kanban app template',
      'trello ui kit',
      'project management app',
      'build a trello clone',
    ],
    sector: 'Productivity',
    screens: ['Boards', 'Board view', 'Card detail', 'Lists', 'Activity', 'Profile'],
  },
  linear: {
    tagline: 'Linear design blueprint — build a fast issue-tracker app',
    blurb:
      'A full spec of the Linear iOS app — the dense issue list, the Cmd+K command menu, cycle bars, status icons, and label pills — captured on a near-OLED canvas with Linear purple.',
    pitch:
      'The blueprint for any issue-tracking, dev-tool, or keyboard-first productivity app. The command menu and ultra-dense list are documented in full.',
    keywords: [
      'linear clone',
      'issue tracker template',
      'linear ui kit',
      'project tool app',
      'build a linear clone',
    ],
    sector: 'Productivity',
    screens: ['Inbox', 'Issue list', 'Issue detail', 'Command menu', 'Cycles', 'Profile'],
  },
  zoom: {
    tagline: 'Zoom UI blueprint — build a video-meeting app',
    blurb:
      'A complete spec of the Zoom iOS app — the gallery video grid, the in-call control bar, active-speaker highlight, and raised-hand — captured in the committed dark theater theme.',
    pitch:
      'The reference for any video-conferencing, telehealth, or live-collab app. The gallery grid and floating control bar are documented to exact tokens.',
    keywords: [
      'zoom clone',
      'video call template',
      'zoom ui kit',
      'react native video meeting',
      'build a zoom clone',
    ],
    sector: 'Productivity',
    screens: ['Meetings', 'In-call gallery', 'Controls', 'Team Chat', 'Schedule', 'Settings'],
  },
  'microsoft-teams': {
    tagline: 'Microsoft Teams design blueprint — build a work-collab app',
    blurb:
      'A full spec of the Microsoft Teams iOS app — the activity feed, the Teams→Channels tree, message cards with reactions, and the meeting join bar — captured with Teams purple.',
    pitch:
      'The blueprint for any enterprise-collaboration or team-chat app. The channels tree, presence dots, and join bar are documented in full.',
    keywords: [
      'microsoft teams clone',
      'team collaboration template',
      'teams ui kit',
      'enterprise chat app',
      'build a teams clone',
    ],
    sector: 'Productivity',
    screens: ['Activity', 'Chat', 'Teams + channels', 'Channel', 'Calendar', 'Calls'],
  },
  'things-3': {
    tagline: 'Things 3 UI blueprint — build a serene task app',
    blurb:
      'A complete spec of the Things 3 iOS app — the circular checkbox fill, the Magic Plus, the Today star, project pie-progress, and generous whitespace — captured on a pure-white canvas.',
    pitch:
      'The reference for any to-do, GTD, or personal-productivity app. The checkbox spring, Magic-Plus drag, and calm layout are documented to exact values.',
    keywords: [
      'things 3 clone',
      'todo app template',
      'things ui kit',
      'gtd task app',
      'build a things 3 clone',
    ],
    sector: 'Productivity',
    screens: ['Today', 'Upcoming', 'Project', 'Task detail', 'Areas', 'Logbook'],
  },
  obsidian: {
    tagline: 'Obsidian design blueprint — build a knowledge-graph app',
    blurb:
      'A full spec of the Obsidian iOS app — the physics graph view, the backlinks pane, the markdown editor, file tree, and tag pills — captured on a charcoal canvas with Obsidian purple.',
    pitch:
      'The blueprint for any note-taking, PKM, or markdown-editor app. The knowledge-graph view and backlinks pane are documented in full.',
    keywords: [
      'obsidian clone',
      'note taking template',
      'obsidian ui kit',
      'markdown editor app',
      'build an obsidian clone',
    ],
    sector: 'Productivity',
    screens: ['Vault', 'Note editor', 'Graph view', 'Backlinks', 'Search', 'Settings'],
  },
  dropbox: {
    tagline: 'Dropbox UI blueprint — build a cloud-storage app',
    blurb:
      'A complete spec of the Dropbox iOS app — colored file-type rows, the preview grid, the upload FAB, and the share sheet — captured on a warm paper-white canvas with Dropbox blue.',
    pitch:
      'The reference for any cloud-storage, file-sync, or document app. The file-type list, preview thumbnails, and upload progress are documented to exact tokens.',
    keywords: [
      'dropbox clone',
      'cloud storage template',
      'dropbox ui kit',
      'file sync app',
      'build a dropbox clone',
    ],
    sector: 'Productivity',
    screens: ['Home', 'Files', 'Preview', 'Photos', 'Offline', 'Account'],
  },
  grindr: {
    tagline: 'Grindr design blueprint — build a proximity dating app',
    blurb:
      'A full spec of the Grindr iOS app — the dense proximity thumbnail cascade, online dots, distance overlays, the profile sheet, and Taps — captured on true black with Grindr yellow.',
    pitch:
      'The blueprint for any location-based dating or social-discovery app. The cascade grid and profile sheet are documented in full.',
    keywords: [
      'grindr clone',
      'dating app template',
      'grindr ui kit',
      'location dating app',
      'build a grindr clone',
    ],
    sector: 'Dating',
    screens: ['Browse grid', 'Profile sheet', 'Taps', 'Messages', 'Filters', 'My profile'],
  },
  okcupid: {
    tagline: 'OkCupid UI blueprint — build a question-based dating app',
    blurb:
      'A complete spec of the OkCupid iOS app — the match-% badge, the DoubleTake stack, question cards, and playful illustration — captured on a clean white canvas with OkCupid magenta.',
    pitch:
      'The reference for any dating, compatibility, or matchmaking app. The match-% count-up and question-driven flow are documented to exact values.',
    keywords: [
      'okcupid clone',
      'dating app template',
      'okcupid ui kit',
      'matchmaking app design',
      'build an okcupid clone',
    ],
    sector: 'Dating',
    screens: ['DoubleTake', 'Profile', 'Match %', 'Likes', 'Messages', 'My profile'],
  },
  gemini: {
    tagline: 'Google Gemini design blueprint — build an AI assistant app',
    blurb:
      'A full spec of the Google Gemini iOS app — the gradient sparkle, the document-not-feed conversation, streaming shimmer, and the prompt bar — captured with the Gemini gradient.',
    pitch:
      'The blueprint for any LLM, assistant, or generative-AI app. The user-chip/assistant-text asymmetry and streaming gradient are documented in full.',
    keywords: [
      'gemini clone',
      'ai assistant template',
      'gemini ui kit',
      'llm chat app',
      'build a gemini clone',
    ],
    sector: 'AI',
    screens: ['Conversation', 'Prompt bar', 'Streaming answer', 'History', 'Gems', 'Settings'],
  },
  copilot: {
    tagline: 'Microsoft Copilot UI blueprint — build an AI companion app',
    blurb:
      'A complete spec of the Microsoft Copilot iOS app — the flourish logo, Fluent acrylic surfaces, the tone selector, prompt chips, and voice — captured with the Copilot gradient + Fluent blue.',
    pitch:
      'The reference for any AI-assistant or copilot-style app. The acrylic surfaces, tone toggle, and prompt-suggestion chips are documented to exact tokens.',
    keywords: [
      'copilot clone',
      'ai assistant template',
      'copilot ui kit',
      'llm companion app',
      'build a copilot clone',
    ],
    sector: 'AI',
    screens: ['Conversation', 'Prompt bar', 'Tone selector', 'Voice mode', 'History', 'Settings'],
  },
  grok: {
    tagline: 'Grok design blueprint — build a real-time AI chat app',
    blurb:
      'A full spec of the Grok iOS app — the monochrome conversation, the real-time X citation card, the mode toggle, and the streaming cursor — captured on a true-black canvas.',
    pitch:
      'The blueprint for any real-time AI, news-aware assistant, or chat app. The citation card and regular/fun mode toggle are documented in full.',
    keywords: [
      'grok clone',
      'ai chat template',
      'grok ui kit',
      'realtime assistant app',
      'build a grok clone',
    ],
    sector: 'AI',
    screens: ['Conversation', 'Citation card', 'Mode toggle', 'Prompt bar', 'History', 'Settings'],
  },
  calm: {
    tagline: 'Calm UI blueprint — build a meditation & sleep app',
    blurb:
      'A complete spec of the Calm iOS app — the nature-photo backdrop, the breathe bubble, the Daily Calm card, and sleep-story rows — captured on a night-sky gradient with serene serif type.',
    pitch:
      'The reference for any meditation, sleep, or mindfulness app. The 4-7-8 breathe bubble and session timer are documented to exact values.',
    keywords: [
      'calm clone',
      'meditation app template',
      'calm ui kit',
      'sleep app design',
      'build a calm clone',
    ],
    sector: 'Health & utility',
    screens: ['Home', 'Breathe', 'Meditate', 'Sleep stories', 'Music', 'Profile'],
  },
  oura: {
    tagline: 'Oura design blueprint — build a health-ring app',
    blurb:
      'A full spec of the Oura iOS app — the tri-domain score rings, contributor bars, the ring-battery, and trend graphs — captured on a cool-charcoal instrument-panel canvas.',
    pitch:
      'The blueprint for any wearable, recovery, or health-scoring app. The Readiness/Sleep/Activity rings and contributor lists are documented in full.',
    keywords: [
      'oura clone',
      'health ring template',
      'oura ui kit',
      'wearable app design',
      'build an oura clone',
    ],
    sector: 'Health & utility',
    screens: ['Today', 'Readiness', 'Sleep', 'Activity', 'Trends', 'Profile'],
  },
  flo: {
    tagline: 'Flo UI blueprint — build a cycle-tracking app',
    blurb:
      'A complete spec of the Flo iOS app — the rotating cycle-phase wheel, symptom-log chips, prediction cards, and soft rounded surfaces — captured with the Flo-coral + lavender palette.',
    pitch:
      'The reference for any period, fertility, or women-health app. The cycle phase wheel and reassuring prediction cards are documented to exact tokens.',
    keywords: [
      'flo clone',
      'cycle tracker template',
      'flo ui kit',
      'period app design',
      'build a flo clone',
    ],
    sector: 'Health & utility',
    screens: ['Today', 'Cycle wheel', 'Symptom log', 'Insights', 'Partner', 'Profile'],
  },
  alltrails: {
    tagline: 'AllTrails design blueprint — build a hiking & trails app',
    blurb:
      'A full spec of the AllTrails iOS app — the trail card with difficulty pills and stats, the topo-map base, the record button, and photo reviews — captured with the AllTrails-green accent.',
    pitch:
      'The blueprint for any outdoor, maps, or activity-recording app. The difficulty color scale and map-first explore are documented in full.',
    keywords: [
      'alltrails clone',
      'hiking app template',
      'alltrails ui kit',
      'outdoor maps app',
      'build an alltrails clone',
    ],
    sector: 'Health & utility',
    screens: ['Explore', 'Trail detail', 'Map', 'Record', 'Saved', 'Profile'],
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
