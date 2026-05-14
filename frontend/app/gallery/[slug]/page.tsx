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
