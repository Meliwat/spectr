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
  type AppSlug,
} from '../apps'
import {
  CATEGORIES,
  CATEGORY_APPS,
  CATEGORY_LABELS,
  isCategorySlug,
} from '../categories'
import CategoryView from '../CategoryView'
import BuySpecButton from '../BuySpecButton'

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
  'vsco': {
    tagline: 'Ship a film-grade photo editor with VSCO\'s exact darkroom system',
    blurb:
      'A complete UI blueprint of the VSCO iOS photo editor, captured from a real screen recording: the pure-black darkroom canvas, the hairline bipolar adjust slider, the film-preset carousel, and the UPPERCASE wide-tracked chrome. It documents every color, type ramp, radius, and motion rule so an AI agent can rebuild the editor without guessing.',
    pitch:
      'Use it as the baseline for any photo or video editor that wants VSCO\'s no-chrome, monochrome restraint instead of a generic toolbar app. Slider hairlines, preset tiles, tool tray, Studio contact-sheet grid, and tab bar are all specified to exact hex values and pixel sizes.',
    keywords: [
      'vsco clone',
      'vsco ui kit',
      'vsco react native template',
      'build a vsco clone',
      'photo editor app design spec',
    ],
    sector: 'Photo & Video Editing',
    screens: [
      'Photo editor with film-preset carousel',
      'Hairline adjust slider and tool tray',
      'Studio contact-sheet grid',
      'Recipe save and apply',
      'Discover editorial feed',
      'Profile and gallery',
    ],
  },

  'clubhouse': {
    tagline: 'Build a live-audio social app with Clubhouse\'s warm hallway system',
    blurb:
      'A complete UI blueprint of the Clubhouse iOS app, captured from a real screen recording: the cream hallway, the serif room titles, the grid of circular speaker avatars, and the emerald speaking-pulse ring. It documents every color, the serif/sans type pairing, the all-pill controls, and the motion so an AI agent can rebuild a live Room without guessing.',
    pitch:
      'Use it as the baseline for any drop-in audio, live-room, or voice-social product that wants Clubhouse\'s intimate salon warmth instead of a cold chat UI. The speaking pulse, raise-hand bar, speaker grid, Hallway cards, and warm dark mode are all specified to exact hex values.',
    keywords: [
      'clubhouse clone',
      'clubhouse ui kit',
      'clubhouse react native template',
      'build a clubhouse clone',
      'live audio social app design spec',
    ],
    sector: 'Live Audio Social',
    screens: [
      'Live Room with speaker grid',
      'Raise-hand and mic control bar',
      'The Hallway of live and upcoming rooms',
      'Start a room composer',
      'Profile and clubs',
      'Explore and scheduled rooms',
    ],
  },

  'lemon8': {
    tagline: 'Clone the lifestyle magazine app with its staggered masonry discovery feed',
    blurb:
      'A complete UI blueprint of the Lemon8 iOS app, documented from a real screen recording down to its bright editorial white canvas, two-column staggered masonry feed, pastel topic-tag system, and sparing Lemon8 Yellow accent. Every color, font, radius, shadow, and motion value is captured so an AI agent can rebuild it faithfully.',
    pitch:
      'Use it as the baseline for any lifestyle, discovery, or content-community app that needs a Pinterest-meets-magazine masonry feed with rich photo cards. The card elevation, pastel category tags, segmented top tabs, and yellow post FAB are all specified to exact hex codes and spacing.',
    keywords: [
      'lemon8 clone',
      'lemon8 ui kit',
      'lemon8 react native template',
      'build a lemon8 clone',
      'lifestyle discovery app design spec',
    ],
    sector: 'Lifestyle Social',
    screens: [
      'Staggered masonry discovery feed',
      'Lifestyle card with pastel tags',
      'Post detail magazine article',
      'Top segmented Following/For You tabs',
      'Creator profile with grid',
      'Topic hub feed',
    ],
  },

  'flickr': {
    tagline: 'Clone the photographer-first photo community with its signature justified mosaic',
    blurb:
      'A complete UI blueprint of the Flickr iOS app, documented from a real screen recording down to its near-black gallery canvas, justified photo mosaic, EXIF camera-detail tables, and twin Pink and Blue brand dots. Every color, font, radius, and motion value is captured so an AI agent can rebuild it pixel-accurately.',
    pitch:
      'Use it as the baseline for any photo-sharing or portfolio app where the image leads and chrome recedes into negative space. Layout packing, the five-point favorite star, the camera-metadata table, and the translucent tab bar are all specified to exact hex codes and spacing.',
    keywords: [
      'flickr clone',
      'flickr ui kit',
      'flickr react native template',
      'build a flickr clone',
      'photo sharing app design spec',
    ],
    sector: 'Photo Sharing',
    screens: [
      'Justified photo mosaic photostream',
      'Photo detail with EXIF table',
      'Camera and lens metadata chips',
      'Favorite star + action bar',
      'Albums and galleries grid',
      'Profile with photostream',
    ],
  },

  'vimeo': {
    tagline: 'Ship a cinematic, creator-first video app with Vimeo-grade polish',
    blurb:
      'A complete UI blueprint of the Vimeo iOS app, documenting the near-black screening-room canvas, the auto-fading cinematic player, the iconic Staff Pick gold badge, and the curated watch feed. Captured from a real screen recording and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any premium video, film, or creator-portfolio app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #0D0E12 ink canvas, the single #00ADEF accent, the #FFD24C curation star, the scrubber, and the creator attribution row.',
    keywords: [
      'vimeo clone',
      'vimeo ui kit',
      'vimeo react native template',
      'build a vimeo clone',
      'video streaming app design spec',
    ],
    sector: 'Video & Creator Platforms',
    screens: [
      'Cinematic video player with auto-fading scrubber and HD chip',
      'Video meta block with creator avatar and Follow pill',
      'Curated Staff Picks watch feed',
      'Staff Pick badge (pill and thumbnail-corner variants)',
      'Creator / channel profile with follower count',
      'Five-slot bottom tab with emphasized center Upload action',
    ],
  },

  'vero': {
    tagline: 'Ship a calm, no-algorithm social app with Vero true-black polish',
    blurb:
      'A complete UI blueprint of the Vero iOS app, documenting the pure true-black gallery canvas, the strictly chronological feed, the single teal-to-blue brand gradient, and the seven first-class post types. Captured from a real screen recording and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any anti-algorithm, chronological, or multi-format social app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #000000 canvas, the #00D1C1 to #0079D3 gradient, the flat #00C2B8 teal accent, the 7 post-type selector, and the hairline-divided feed.',
    keywords: [
      'vero clone',
      'vero ui kit',
      'vero react native template',
      'build a vero clone',
      'social feed app design spec',
    ],
    sector: 'Social & Community',
    screens: [
      'Strictly chronological true-black feed',
      'Seven post-type selector (photo, video, link, music, film, book, place)',
      'Photo post card with type chip and action row',
      'Book post inner card with amber star rating',
      'Gradient compose ring and primary Post button',
      'Five-slot bottom tab with center compose action',
    ],
  },

  'gas': {
    tagline: 'Ship a joyful, anonymous compliments app with Gas-grade playfulness',
    blurb:
      'A complete UI blueprint of the Gas iOS app, documenting the full-bleed indigo-to-purple gradient world, the big white compliment poll card, the 2x2 colorful choice grid, and the flame currency loop. Captured from a real screen recording and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any poll, anonymous-compliments, or playful Gen-Z social app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and spring timing — the #6C5CE7 to #A06CFF gradient, the four fixed choice colors, the #FF7A45 flame currency, the 28pt poll card, and the heavy Nunito type.',
    keywords: [
      'gas app clone',
      'gas ui kit',
      'gas react native template',
      'build a gas clone',
      'anonymous polls app design spec',
    ],
    sector: 'Social & Polls',
    screens: [
      'Full-bleed gradient poll loop with centered card',
      'Anonymous compliment poll card with 2x2 name choices',
      'Flame currency pill and earn animation',
      'Progress dots and skip affordance',
      'Who-picked-you reveal card with flame unlock',
      'Five-slot frosted tab bar with raised center add action',
    ],
  },

  'locket': {
    tagline: 'Ship a warm, widget-first photo app with Locket-grade intimacy',
    blurb:
      'A complete UI blueprint of the Locket Widget iOS app, documenting the warm cream-gold world, the square full-bleed friend photo, the big circular capture button, and the friends photo-history grid. Captured from a real screen recording and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any widget-first, close-friends, or photo-sharing app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #FFF7EC cream world, the #FFB02E gold accent, the 40pt square viewfinder, the 84pt capture button, and the honey-tinted shadows.',
    keywords: [
      'locket clone',
      'locket ui kit',
      'locket react native template',
      'build a locket clone',
      'photo widget app design spec',
    ],
    sector: 'Photo & Friends',
    screens: [
      'Square full-bleed friend photo viewfinder',
      'Big circular capture button with gold ring',
      'Sender chip and caption pill on frosted glass',
      'Friends photo-history grid',
      'Home Screen widget mock',
      'Three-slot minimal tab bar over the warm world',
    ],
  },

  'imessage': {
    tagline: 'Apple iMessage blue and green bubble chat thread, tapbacks, typing dots',
    blurb:
      'A pixel-faithful blueprint of the iMessage iOS thread: outgoing iMessage Blue (#007AFF) bubbles with white text, SMS Green (#34C759) fallback, and incoming gray bubbles (#E9E9EB light, #26262A dark) with a pinched ~6pt tail corner at a 19pt radius. Includes the centered avatar-over-name nav bar, the six-glyph tapback strip, pulsing typing dots, Delivered/Read receipts, and the blur-backed compose bar.',
    pitch:
      'Build a complete Apple-grade messaging client documented down to the exact system hex values, SF Pro Dynamic Type ramp, and 3pt/9pt bubble grouping rhythm. Ship SwiftUI, Expo, and Jetpack Compose with the tapback capsule, typing indicator, and true-black OLED dark mode all specced to production fidelity.',
    keywords: [
      'imessage clone',
      'imessage ui kit',
      'imessage react native template',
      'build an imessage clone',
      'messaging app design spec',
    ],
    sector: 'Messaging',
    screens: [
      'Conversation thread with blue and gray bubbles',
      'SMS green fallback bubble',
      'Tapback reaction strip and docked chip',
      'Typing indicator with pulsing dots',
      'Delivered and Read receipts',
      'Blur-backed compose input bar',
    ],
  },

  'viber': {
    tagline: 'Viber purple chat thread with free-call banner, sticker market, check receipts',
    blurb:
      'A pixel-faithful blueprint of the Viber iOS conversation: outgoing Viber Purple (#7360F2) bubbles with white text, incoming gray bubbles (#EDEBF5 light, #26232F dark) at a 16pt radius with a 5pt tail, and the three-state check receipt (one gray sent, two gray delivered, two violet #8F7DF7 seen). Includes the purple-to-deep-violet (#59267C) free-call banner, call-first header with phone and video icons, the sticker market, and the aubergine-tinted (#121118) dark canvas.',
    pitch:
      'Build a complete call-first messenger documented to the exact Rakuten-purple hex palette, Manrope-substitute type ramp, and 4pt/8pt bubble grouping rhythm. Ship SwiftUI, Expo, and Jetpack Compose with the violet seen-receipt recolor, free-call banner gradient, and borderless 96pt in-thread stickers all specced to production fidelity.',
    keywords: [
      'viber clone',
      'viber ui kit',
      'viber react native template',
      'build a viber clone',
      'messaging app design spec',
    ],
    sector: 'Messaging',
    screens: [
      'Conversation thread with purple and gray bubbles',
      'Free Viber Call banner with gradient',
      'Three-state check receipt sent delivered seen',
      'In-thread borderless sticker',
      'Call-first chat header with phone and video',
      'Aubergine-tinted dark mode canvas',
    ],
  },

  'skype': {
    tagline: 'Skype cloud-blue call-first chat with video grid, call cards, presence dots',
    blurb:
      'A pixel-faithful blueprint of the Skype iOS app: outgoing deep Skype Blue (#0078D4) bubbles with white text, incoming gray bubbles (#EBEBEF light, #2A2A30 dark) at a 14pt radius with a 4pt tail, and the bright Skype Blue (#00AFF0) driving buttons, call FABs, and tab selection. Includes the call-first header with phone and video icons, inline call cards interleaved in the chat, the gradient video-call grid with per-tile mic and a circular control bar, and presence dots on every avatar.',
    pitch:
      'Build a complete call-first messenger documented to the exact Microsoft cloud-blue hex palette, Segoe-UI-substitute type ramp, and 5pt/8pt bubble grouping rhythm. Ship SwiftUI, Expo, and Jetpack Compose with the video grid, inline call cards, accept-green and end-red controls, and a neutral near-black (#16161A) dark canvas all specced to production fidelity.',
    keywords: [
      'skype clone',
      'skype ui kit',
      'skype react native template',
      'build a skype clone',
      'video calling app design spec',
    ],
    sector: 'Messaging',
    screens: [
      'Conversation thread with blue and gray bubbles',
      'Inline call card in chat history',
      'Video call grid with self-view and per-tile mic',
      'Circular in-call control bar',
      'Call-first chat header with phone and video',
      'Presence dots green away offline',
    ],
  },

  'kik': {
    tagline: 'Kik username-first chat with S/D/R receipts, bots, and Kik Codes',
    blurb:
      'A pixel-faithful blueprint of the Kik iOS app: outgoing Kik Blue (#00B0F0) bubbles with dark-cyan ink (#002A36 for WCAG AA), incoming gray bubbles (#E9EAEC light, #25282D dark) at a 16pt radius with a 5pt tail, and the single-letter S/D/R receipt (Sent gray, Delivered gray, Read turns Kik Blue). Includes the anonymous @username conversation list, first-class bots with rounded-square avatars and a BOT tag, the circular dotted Kik Code plate, and a neutral near-black (#121316) dark canvas.',
    pitch:
      'Build a complete username-first messenger documented to the exact modern Kik-Blue hex palette (with the heritage #82BC23 green noted), Inter-substitute type ramp, and 4pt/8pt bubble grouping rhythm. Ship SwiftUI, Expo, and Jetpack Compose with the S/D/R receipt logic, bot list treatment, Kik Code plate, and text Send affordance all specced to production fidelity.',
    keywords: [
      'kik clone',
      'kik ui kit',
      'kik react native template',
      'build a kik clone',
      'messaging app design spec',
    ],
    sector: 'Messaging',
    screens: [
      'Username-first conversation list',
      'Chat thread with blue and gray bubbles',
      'S D R single-letter receipts',
      'Bot row with rounded-square avatar and BOT tag',
      'Kik Code scannable plate',
      'Neutral near-black dark mode canvas',
    ],
  },

  'groupme': {
    tagline: 'Clone the friendly group chat with blue chrome and heart-like message reactions',
    blurb:
      'A production-grade design spec for a GroupMe-style group messaging app. Covers the signature blue chat nav bar, blue outbound bubbles, the docked heart-like count pill, circular gradient avatars, and per-group color themes.',
    pitch:
      'Ship a GroupMe clone without guessing a single hex value. Every token, bubble shape, like-pill offset, and avatar gradient is documented for SwiftUI, Expo, and Jetpack Compose.',
    keywords: [
      'groupme clone',
      'groupme ui kit',
      'groupme react native template',
      'build a groupme clone',
      'group messaging app design spec',
    ],
    sector: 'Messaging',
    screens: [
      'Group chat thread with blue outbound bubbles',
      'Heart-like count pill docked under a bubble',
      'Chats list with circular group avatars',
      'Inline image gallery grid in a bubble',
      'Per-group theme color picker',
      'Pill composer with attachment sheet',
    ],
  },

  'kakaotalk': {
    tagline: 'Clone Korea’s super-app messenger with yellow bubbles and the iconic unread mark',
    blurb:
      'A production-grade design spec for a KakaoTalk-style messaging super-app. Covers Kakao Yellow outbound bubbles on brown text, the side-docked unread count mark, rounded-square avatars, the blue-gray chat backdrop, and gifticon cards.',
    pitch:
      'Build a KakaoTalk clone without guessing a single hex value. Every token, bubble shape, the iconic side-docked unread mark, and the rounded-square avatar are documented for SwiftUI, Expo, and Jetpack Compose.',
    keywords: [
      'kakaotalk clone',
      'kakaotalk ui kit',
      'kakaotalk react native template',
      'build a kakaotalk clone',
      'messaging app design spec',
    ],
    sector: 'Messaging',
    screens: [
      'Friends roster with profile banner and statuses',
      'Chat thread on the blue-gray backdrop',
      'Yellow outbound bubble with side-docked unread mark',
      'Kakao Friends emoticon sticker keyboard',
      'Gifticon gift-voucher card with barcode redeem',
      'Composer with the super-app plus menu',
    ],
  },

  'zalo': {
    tagline: 'Clone Vietnam\'s #1 messaging super-app with its blue chat thread and mini-app hub',
    blurb:
      'A complete UI blueprint of the Zalo iOS app, documented from a real screen recording down to its single Zalo Blue anchor, asymmetric clipped-tail chat bubbles, calm blue-grey thread backdrop, and the mini-app service launcher grid. Every color, font, radius, and motion value is captured so an AI agent can rebuild it faithfully.',
    pitch:
      'Use it as the baseline for any messaging or super-app that needs a polished chat thread plus a services hub, with Vietnamese-first typography. The bubble shape, blue header, read receipts, launcher tiles, and dense list rows are all specified to exact hex codes and spacing.',
    keywords: [
      'zalo clone',
      'zalo ui kit',
      'zalo react native template',
      'build a zalo clone',
      'messaging super-app design spec',
    ],
    sector: 'Messaging Super-App',
    screens: [
      'Chat thread with asymmetric bubbles',
      'Blue chat header + composer',
      'Chat list with unread badges',
      'Mini-app service launcher grid',
      'Social timeline (Nhat ky) feed',
      'Contacts and profile',
    ],
  },

  'threema': {
    tagline: 'A privacy-first messenger with no phone number and signature red-orange-green trust dots',
    blurb:
      'Threema strips identity down to an anonymous 8-character ID and makes contact verification the whole product, surfaced as three trust-level dots that move from red to orange to green. A single Threema Green accent over a calm white canvas keeps the focus on encryption and trust.',
    pitch:
      'Clone the secure messenger that proved you can chat without handing over your phone number. This pack ships the exact Threema Green, the red-orange-green trust palette, and the QR verify ritual with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'threema clone',
      'threema ui kit',
      'threema react native template',
      'build a threema clone',
      'encrypted messenger app design spec',
    ],
    sector: 'Secure Messaging',
    screens: [
      'Conversation list with per-contact trust dots',
      'Encrypted chat with green outgoing bubbles',
      'Contact detail with trust-level badge',
      'QR verify scanner and green-dot upgrade',
      'My ID card with Threema ID and fingerprint',
      'Add contact via Threema ID',
    ],
  },

  'expedia': {
    tagline: 'A deal-forward travel marketplace built on bundles, One Key rewards, and big price typography',
    blurb:
      'Expedia pairs full-bleed property photography with a relentless savings story: strikethrough prices, bundle flags, member rates, and One Key earn lines on every card. The search-and-results loop, navy review-score badge, and yellow deal accent define the entire experience.',
    pitch:
      'Clone the search-and-results loop that powers one of travel commerce. This pack ships the exact Expedia Yellow, Action Blue, navy review badge, and One Key gold tokens with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'expedia clone',
      'expedia ui kit',
      'expedia react native template',
      'build an expedia clone',
      'travel booking app design spec',
    ],
    sector: 'Travel Booking',
    screens: [
      'Search home with Stays / Flights / Cars / Bundle switch',
      'Property results list with deal flags and review badges',
      'Property detail with photo gallery and room rates',
      'Bundle + Save package builder',
      'One Key rewards and account balance',
      'Trips itinerary timeline',
    ],
  },

  'kayak': {
    tagline: 'A metasearch instrument with price forecasting, fare-compare matrix, and Hacker Fares',
    blurb:
      'KAYAK compares the entire travel market and tells you whether to buy now or wait, using a color-coded price calendar, a forecast banner with confidence scores, and the signature Hacker Fare. A single scarce orange accent over a near-neutral canvas keeps the focus on the numbers.',
    pitch:
      'Clone the metasearch tool that did the math for travelers everywhere. This pack ships the exact KAYAK Orange accent plus the functional price-signal ramp with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'kayak clone',
      'kayak ui kit',
      'kayak react native template',
      'build a kayak clone',
      'flight metasearch app design spec',
    ],
    sector: 'Travel Metasearch',
    screens: [
      'Search form with trip-type and price calendar',
      'Flight results with price calendar and forecast banner',
      'Fare detail with full leg breakdown and providers',
      'Fare-compare matrix by airline and stops',
      'Price Alerts list with trend sparklines',
      'Trips and saved searches',
    ],
  },

  'vrbo': {
    tagline: 'A whole-home vacation rental marketplace built on full-bleed photo galleries and a sticky price bar',
    blurb:
      'Vrbo leads every listing with an edge-to-edge swipeable photo gallery and pins a heavy nightly price plus a blue Book now button to the bottom of the screen at all times. A single Vrbo Blue action color and one gold review star keep the focus on the house and the price.',
    pitch:
      'Clone the whole-home rental marketplace where you book the entire place, never a shared room. This pack ships the exact Vrbo Blue, Sky Blue, and gold review star tokens with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'vrbo clone',
      'vrbo ui kit',
      'vrbo react native template',
      'build a vrbo clone',
      'vacation rental app design spec',
    ],
    sector: 'Vacation Rentals',
    screens: [
      'Search home with Where-to and dates pill',
      'Results list with big photo cards and ratings',
      'Listing detail with full-bleed photo gallery',
      'Sticky booking bar with price and Book now',
      'Map view with blue and gold price pins',
      'Trip boards with saved-property cards',
    ],
  },

  'marriott-bonvoy': {
    tagline: 'A premium hotel booking and loyalty app where gold is reserved strictly for member value',
    blurb:
      'Marriott Bonvoy pairs a deep navy concierge base with disciplined gold that only ever marks earned value: your points balance, your elite tier, redemption rates, and the Book button. Big hotel heroes, a points-aware rate select, and the Mobile Key carry the premium loyalty story.',
    pitch:
      'Clone the hotel loyalty app that turned points into the centerpiece of the booking flow. This pack ships the exact Bonvoy navy and disciplined gold tokens, the points panel, and points-aware rate cards with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'marriott bonvoy clone',
      'marriott bonvoy ui kit',
      'marriott bonvoy react native template',
      'build a marriott bonvoy clone',
      'hotel loyalty app design spec',
    ],
    sector: 'Hotel Loyalty',
    screens: [
      'Search home with Where-to and dates',
      'Hotel detail with full-bleed hero and sub-brand eyebrow',
      'Bonvoy points panel with tier and progress bar',
      'Points-aware rate select with member and redemption rates',
      'Sticky booking bar with points earned',
      'Mobile Key card and elite tier badges',
    ],
  },

  'delta': {
    tagline: 'Boarding-pass-first airline UI with a live flight-status timeline and SkyMiles',
    blurb:
      'A faithful Delta-inspired design system built around the digital boarding pass and a live departure-to-arrival status timeline. Delta Blue anchors the brand while a single widget-red accent drives every primary action.',
    pitch:
      'Clone the Fly Delta experience: navy gradient trip headers, a scannable boarding pass, and functional on-time, delayed, and canceled status colors. Every token, font weight, and corner radius is specified for SwiftUI, Expo, and Jetpack Compose.',
    keywords: [
      'delta clone',
      'delta ui kit',
      'delta react native template',
      'build a delta clone',
      'airline app design spec',
    ],
    sector: 'Travel and Airlines',
    screens: [
      'Today trip header',
      'Digital boarding pass',
      'Flight status timeline',
      'Trips list',
      'SkyMiles balance',
      'Bag tracker',
    ],
  },

  'united-airlines': {
    tagline: 'Detail-rich airline UI with a perforated boarding pass and interactive seat map',
    blurb:
      'A faithful United-inspired design system built around the flight-detail to boarding-pass flow with an interactive Economy Plus seat map. A two-blue brand pairs deep United Blue with electric Rhapsody Blue for every action.',
    pitch:
      'Clone the United experience: a navy flight-detail header, a perforated boarding pass with notch cut-outs, and a tap-to-select seat map. Every token, font weight, and 4pt corner radius is specified for SwiftUI, Expo, and Jetpack Compose.',
    keywords: [
      'united airlines clone',
      'united airlines ui kit',
      'united airlines react native template',
      'build a united airlines clone',
      'airline app design spec',
    ],
    sector: 'Travel and Airlines',
    screens: [
      'Flight detail header',
      'Digital boarding pass',
      'Interactive seat map',
      'Trips list',
      'MileagePlus status',
      'Bag tracker',
    ],
  },

  'southwest': {
    tagline: 'Open-seating airline UI built around the A/B/C boarding position and a 24-hour check-in countdown',
    blurb:
      'A faithful Southwest-inspired design system with no seat map at all: the hero is the giant A/B/C boarding position in Warm Yellow over a deep navy canvas, plus a launch-clock check-in countdown. The Heart tri-color (Blue, Red, Yellow) is a strict role system where Yellow is the one CTA and Red means something is wrong.',
    pitch:
      'Clone the only airline app with no assigned seats. This pack ships the exact Heart palette, the oversized boarding-position readout, the 24-hour check-in ring, the Wanna Get Away fare ladder, and Rapid Rewards with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'southwest clone',
      'southwest ui kit',
      'southwest react native template',
      'build a southwest clone',
      'airline app design spec',
    ],
    sector: 'Travel and Airlines',
    screens: [
      'Boarding position and check-in',
      'Digital boarding pass',
      'Flight booking and fare selection',
      'Trips list',
      'Rapid Rewards balance',
      'Flight status timeline',
    ],
  },

  'turo': {
    tagline: 'Peer-to-peer car-sharing UI where the vehicle photo is the product',
    blurb:
      'A faithful Turo-inspired design system built like Airbnb-for-cars: full-bleed vehicle photos, host trust signals, a specs strip, and a sticky price plus Book bar. Turo Purple drives every booking action while Turo Teal signals trust, value and All-Star hosts.',
    pitch:
      'Clone the car-sharing marketplace where photography carries the experience. This pack ships the exact purple and teal palette, the full-bleed photo-led listing detail, the All-Star host card, the pinned Book bar, and map price pins with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'turo clone',
      'turo ui kit',
      'turo react native template',
      'build a turo clone',
      'car sharing marketplace app design spec',
    ],
    sector: 'Travel and Car Sharing',
    screens: [
      'Car listing detail with photo carousel',
      'Search results photo cards',
      'Map view with price pins',
      'Booking and trip checkout',
      'Host profile and reviews',
      'Trips and favorites',
    ],
  },

  'skyscanner': {
    tagline: 'Skyscanner design blueprint — build a flight-search and price-comparison app',
    blurb:
      'A complete UI blueprint of the Skyscanner iOS app — the stacked search card, the month price grid, flight result rows, and the Best/Cheapest/Fastest sort triad — captured with every color, type scale, and spacing rule intact.',
    pitch:
      'Use this spec as the foundation for any flight, travel, or price-comparison app where finding a good deal is the whole point. The signature green-amber-red price language and the Everywhere destination are documented down to hex codes and pixel values.',
    keywords: [
      'skyscanner clone',
      'skyscanner ui kit',
      'skyscanner react native template',
      'build a skyscanner clone',
      'flight search app design spec',
    ],
    sector: 'Travel & flights',
    screens: [
      'Flight search card',
      'Month price calendar',
      'Everywhere explore',
      'Flight results list',
      'Price alerts',
      'Trips + profile',
    ],
  },

  'citymapper': {
    tagline: 'Citymapper design blueprint — build a multimodal transit and navigation app',
    blurb:
      'A complete UI blueprint of the Citymapper iOS app — the colored leg strip, ranked route options, the iconic GO button, GO trip mode, and the live departures board — captured with every mode color, type scale, and spacing rule intact.',
    pitch:
      'Use this spec as the foundation for any transit, journey-planning, or live-navigation app. The theme-invariant mode-color system and the shape-locked GO pill are documented down to hex codes and pixel values.',
    keywords: [
      'citymapper clone',
      'citymapper ui kit',
      'citymapper react native template',
      'build a citymapper clone',
      'transit app design spec',
    ],
    sector: 'Travel & transit',
    screens: [
      'Route options list',
      'Origin to destination',
      'GO trip mode',
      'Live departures board',
      'Nearby stops',
      'Saved + you',
    ],
  },

  'pandora': {
    tagline: 'Music Genome radio UI built around the thumb up and thumb down',
    blurb:
      'A faithful Pandora-inspired design system where the thumb up/down is the product, not a generic like. Now Playing is an album-art gradient hero with no card frame, and the station list is the home, all over a deep blue-navy canvas derived from Pandora Blue.',
    pitch:
      'Clone the radio app that invented the thumb. This pack ships the exact navy palette, the solid-up versus hollow-down thumb asymmetry, the album-art gradient Now Playing, and the genome station list with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'pandora clone',
      'pandora ui kit',
      'pandora react native template',
      'build a pandora clone',
      'music streaming radio app design spec',
    ],
    sector: 'Music and Audio Streaming',
    screens: [
      'Now Playing with thumb up and down',
      'Station list and My Collection',
      'Browse and recommendations',
      'Create station search',
      'Station detail and tune-in',
      'Mini player and recents',
    ],
  },

  'deezer': {
    tagline: 'Clone Deezer: living-gradient Flow artwork, embedded equalizer, scarce purple-pink gradient',
    blurb:
      'A production-grade design system rebuilt from the Deezer iOS app, from the violet-tinted near-black #0F0D13 canvas to the purple-to-pink gradient that lights only the play button, scrubber, and Flow badge. Every token, the living-gradient Flow artwork, and the embedded equalizer are documented for SwiftUI, Expo, and Jetpack Compose.',
    pitch:
      'Ship a Deezer-style streaming app without hand-tuning the Flow signature screen. Exact Deezer purple #A238FF and pink #FF0092, the equalizer embedded inside the artwork, the 68pt circular gradient play button, and the gradient scrubber are spec-ready across three platforms.',
    keywords: [
      'deezer clone',
      'deezer ui kit',
      'deezer react native template',
      'build a deezer clone',
      'music streaming app design spec',
    ],
    sector: 'Music Streaming',
    screens: [
      'Flow Now Playing with living-gradient artwork',
      'Equalizer waveform embedded inside Flow art',
      'Circular purple-to-pink gradient play button',
      'Gradient scrubber with elapsed and remaining time',
      'Now-playing-aware song rows with pink equalizer',
      'Bottom tab bar with purple active tint',
    ],
  },

  'youtube-music': {
    tagline: 'Clone YouTube Music: immersive Now Playing, Song/Video toggle, art-glow player',
    blurb:
      'A production-grade design system rebuilt from the YouTube Music iOS app, from the near-black #030303 canvas to the blurred album-art backdrop behind the player. Every token, the white play button, and the signature Song/Video toggle are documented for SwiftUI, Expo, and Jetpack Compose.',
    pitch:
      'Ship a YouTube Music style streaming app without reverse-engineering the immersive player by hand. Exact YT red #FF0000, the art-derived glow backdrop, the up-next autoplay shelf, and Roboto type scales are spec-ready across three platforms.',
    keywords: [
      'youtube music clone',
      'youtube music ui kit',
      'youtube music react native template',
      'build a youtube music clone',
      'music streaming app design spec',
    ],
    sector: 'Music Streaming',
    screens: [
      'Immersive Now Playing with art-glow backdrop',
      'Song / Video toggle switch',
      'Up-next autoplay queue shelf',
      'Home with quick-picks shelves',
      'Mini-player bar above the tab bar',
      'Scrubber rest and scrubbing states',
    ],
  },

  'amazon-music': {
    tagline: 'Clone Amazon Music: deep teal player, synced X-Ray lyrics, cyan-glow controls',
    blurb:
      'A production-grade design system rebuilt from the Amazon Music iOS app, from the deep teal-navy #0C1B22 canvas to the synced X-Ray lyrics panel with its bright-cyan current line. Every token, the cyan-glow play button, and the top-down player gradient are documented for SwiftUI, Expo, and Jetpack Compose.',
    pitch:
      'Ship an Amazon Music style streaming app without rebuilding the X-Ray lyrics panel by hand. Exact Amazon Cyan #00A8E1, the tap-a-line-to-seek lyric sync, the teal-tinted greys, and Amazon Ember type scales are spec-ready across three platforms.',
    keywords: [
      'amazon music clone',
      'amazon music ui kit',
      'amazon music react native template',
      'build an amazon music clone',
      'music streaming app design spec',
    ],
    sector: 'Music Streaming',
    screens: [
      'Full-screen player with top-down gradient',
      'X-Ray synced lyrics panel',
      'Tap-a-lyric-to-seek interaction',
      'Home with time-of-day greeting and shelves',
      'Mini-player bar above the tab bar',
      'Scrubber rest and dragging states',
    ],
  },

  'iheartradio': {
    tagline: 'Clone iHeartRadio: live-station player, pulsing LIVE badge, scanning bar, no scrubber',
    blurb:
      'A production-grade design system rebuilt from the iHeartRadio iOS app, from the warm maroon-black #120A0E canvas to the scarce iHeart red-to-magenta system (#C6002B to #E40A5D, coral #F23A2F) that lights the play button and a pulsing LIVE badge. Every token, the heart-logomark station tile, and the no-scrubber scanning bar are documented for SwiftUI, Expo, and Jetpack Compose.',
    pitch:
      'Ship a live-radio app without re-deriving why a broadcast has no seek. Exact iHeart red #C6002B and coral #F23A2F, the pulsing LIVE badge, the indeterminate scanning bar instead of a scrubber, and the stop-not-pause transport are spec-ready across three platforms.',
    keywords: [
      'iheartradio clone',
      'iheartradio ui kit',
      'iheartradio react native template',
      'build a iheartradio clone',
      'live radio app design spec',
    ],
    sector: 'Live Radio & Podcasts',
    screens: [
      'Live Station Player with heart-logomark tile',
      'Pulsing coral LIVE badge over the station art',
      'Indeterminate scanning bar instead of a scrubber',
      'Circular red play and stop transport (no pause)',
      'Live station rows with coral LIVE tags',
      'Bottom tab bar with coral active tint',
    ],
  },

  'bandcamp': {
    tagline: 'Clone Bandcamp: paper-editorial album page, big square art, teal buy-and-support card',
    blurb:
      'A production-grade design system rebuilt from the Bandcamp iOS app, from the paper-white #FFFFFF and #F4F4F4 canvas to the scarce Bandcamp Teal #1DA0C3 reserved for artist links, the buy price, and the fan collection. Every token, the big square album art, and the buy-and-support card are documented for SwiftUI, Expo, and Jetpack Compose.',
    pitch:
      'Ship a Bandcamp-style music marketplace without re-deriving the editorial album page. Exact Bandcamp Teal #1DA0C3, the name-your-price buy card, the inline teal-waveform player, and the fan collection feed are spec-ready across three platforms.',
    keywords: [
      'bandcamp clone',
      'bandcamp ui kit',
      'bandcamp react native template',
      'build a bandcamp clone',
      'music marketplace app design spec',
    ],
    sector: 'Music Marketplace',
    screens: [
      'Album page with full-bleed big square art',
      'Buy-and-support card with name-your-price',
      'Inline teal-waveform player with tabular time',
      'Numbered tracklist with teal playing track',
      'Fan collection feed of bought-album cards',
      'Bottom tab bar with teal active tint',
    ],
  },

  'pocket-casts': {
    tagline: 'A premium podcast player with per-podcast theming and power-user playback controls',
    blurb:
      'Pocket Casts pairs its signature red with a near-black canvas and a color tint sampled from each show. Circular cover art, an Up Next queue, and Trim Silence define the listening experience.',
    pitch:
      'This design pack documents the Pocket Casts Now Playing player, episode list, and per-podcast theme-tint engine with exact hex and type. Build a connoisseur-grade podcast app with circular transport, pill buttons, and a reorderable Up Next queue.',
    keywords: [
      'pocket casts clone',
      'pocket casts ui kit',
      'pocket casts react native template',
      'build a pocket casts clone',
      'podcast player app design spec',
    ],
    sector: 'Podcasts',
    screens: [
      'Now Playing player',
      'Podcast grid',
      'Episode list',
      'Up Next queue',
      'Filters',
      'Playback effects',
    ],
  },

  'overcast': {
    tagline: 'An audio-first podcast player built around Smart Speed and Voice Boost',
    blurb:
      'Overcast pairs a single warm orange accent with a paper-cream canvas and a true dark theme. Its outlined orange-ring play button, Smart Speed, and Voice Boost define a calm, audiophile listening experience.',
    pitch:
      'This design pack documents the Overcast Now Playing player, playlist rows, and Smart Speed / Voice Boost toggles with exact hex and type. Build a fast, restrained podcast app with an orange-ring play control and editorial list spacing.',
    keywords: [
      'overcast clone',
      'overcast ui kit',
      'overcast react native template',
      'build an overcast clone',
      'podcast player app design spec',
    ],
    sector: 'Podcasts',
    screens: [
      'Now Playing player',
      'Playlists',
      'Episode list',
      'Smart Speed settings',
      'Recommendations',
      'Podcast search',
    ],
  },

  'peacock': {
    tagline: 'Indigo-black canvas, feather-swoosh accent, full-bleed hero billboard, and a white Play CTA',
    blurb:
      'A complete design system inspired by Peacock TV: the permanently-dark indigo-black canvas, the five-color feather swoosh, the channels rail, and the cinematic hero billboard. Every token, type ramp, and component spec to clone the NBCUniversal streaming look.',
    pitch:
      'Stop reverse-engineering Peacock screenshots frame by frame. Get the exact hex values, Poppins type scale, hero scrim math, and copy-paste SwiftUI, Expo, and Jetpack Compose components in one spec.',
    keywords: [
      'peacock clone',
      'peacock ui kit',
      'peacock react native template',
      'build a peacock clone',
      'streaming app design spec',
    ],
    sector: 'Video Streaming',
    screens: [
      'Home billboard',
      'Channels rail',
      'Trending row',
      'Title detail',
      'Live and sports',
      'My Stuff',
    ],
  },

  'paramount-plus': {
    tagline: 'Midnight-navy canvas, brand-hubs row, single Paramount+ Blue accent, prestige hero billboard',
    blurb:
      'A complete design system inspired by Paramount+: the dark-only navy canvas, the network brand-hubs row, the single electric-blue accent, and the live-TV-and-sports pillar. Every token, type ramp, and component spec to clone the network-bundle streaming look.',
    pitch:
      'Stop reverse-engineering Paramount+ screenshots frame by frame. Get the exact hex values, Inter type scale, hub-chip gradients, hero scrim math, and copy-paste SwiftUI, Expo, and Jetpack Compose components in one spec.',
    keywords: [
      'paramount plus clone',
      'paramount plus ui kit',
      'paramount plus react native template',
      'build a paramount plus clone',
      'streaming app design spec',
    ],
    sector: 'Video Streaming',
    screens: [
      'Home hub',
      'Brand hubs row',
      'Hero billboard',
      'Live TV and sports',
      'Title detail',
      'My List',
    ],
  },

  'apple-tv': {
    tagline: 'True-black canvas, inset floating hero, Up Next rail, one system-blue accent, SF Pro',
    blurb:
      'A complete design system inspired by the Apple TV app: the true-black OLED canvas, the inset rounded floating hero, the Up Next rail with white resume bars, and the single system-blue accent. Every token, type ramp, and component spec to clone Apple’s most restrained streaming surface.',
    pitch:
      'Stop reverse-engineering the Apple TV app screenshot by screenshot. Get the exact hex values, SF Pro / HIG type scale, hero scrim math, glass-chrome recipes, and copy-paste SwiftUI, Expo, and Jetpack Compose components in one spec.',
    keywords: [
      'apple tv clone',
      'apple tv ui kit',
      'apple tv react native template',
      'build an apple tv clone',
      'streaming app design spec',
    ],
    sector: 'Video Streaming',
    screens: [
      'Watch Now',
      'Up Next rail',
      'Inset hero card',
      'MLS Season Pass',
      'Title detail',
      'Search',
    ],
  },

  'crunchyroll': {
    tagline: 'Ship a cinematic, anime-first streaming app with Crunchyroll-grade polish',
    blurb:
      'A complete UI blueprint of the Crunchyroll iOS app, documenting the true-black OLED canvas, the single Crunchyroll Orange accent, the full-bleed key-art hero with a bottom-to-black scrim, and the resume-aware episode list. Captured from the real product and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any anime, TV, or premium video-streaming app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #000000 canvas, the single #F47521 accent, the #FFC107 Premium badge, the orange episode-progress bar, and the Sub | Dub control.',
    keywords: [
      'crunchyroll clone',
      'crunchyroll ui kit',
      'crunchyroll react native template',
      'build a crunchyroll clone',
      'anime streaming app design spec',
    ],
    sector: 'Video & Streaming',
    screens: [
      'Full-bleed anime detail hero with Simulcast badge and gradient scrim',
      'Full-width orange Start Watching button with icon action row',
      'Resume-aware episode list with number chip and orange progress bar',
      'Content badges (Simulcast, Premium, Sub | Dub, New Episode)',
      'Segmented control with sliding orange underline',
      'Five-tab bottom bar (Home, Browse, Watchlist, Manga, Profile)',
    ],
  },

  'plex': {
    tagline: 'Ship a calm, server-driven personal-media app with Plex-grade polish',
    blurb:
      'A complete UI blueprint of the Plex iOS app, documenting the cool charcoal canvas, the single Plex Yellow accent, the On Deck resume rail, the library poster grid, and the signature multi-server picker. Captured from the real product and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any media-server, library, or personal-streaming app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #1F2326 charcoal canvas, the single #E5A00D accent with dark #1A1304 button text, the yellow On Deck progress bar, and the multi-server status picker.',
    keywords: [
      'plex clone',
      'plex ui kit',
      'plex react native template',
      'build a plex clone',
      'media server app design spec',
    ],
    sector: 'Video & Streaming',
    screens: [
      'Home with server picker, On Deck rail and library poster grid',
      'On Deck resume tile with centered play overlay and yellow progress bar',
      'Server picker sheet with online or offline status dots and yellow check',
      'Library poster grid with yellow unwatched corner dots',
      'Yellow Play button with dark label plus Mark as Watched action',
      'Five-tab bottom bar (Home, Library, Discover, Live TV, You)',
    ],
  },

  'espn': {
    tagline: 'Ship a fast, live-first sports scoreboard app with ESPN-grade polish',
    blurb:
      'A complete UI blueprint of the ESPN iOS app, documenting the near-black canvas, the single ESPN Red accent, the pinned horizontal scores ticker, the live game card, and the SportsCenter feed. Captured from the real product and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any sports, scores, or live-event app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #0E0F11 canvas, the single #D50A0A accent, the #FF1A1A pulsing LIVE badge, the #1FAA59 winning-score green, and tabular numerals on every score.',
    keywords: [
      'espn clone',
      'espn ui kit',
      'espn react native template',
      'build a espn clone',
      'sports scores app design spec',
    ],
    sector: 'Sports & Scores',
    screens: [
      'Pinned horizontal scores ticker with live and final chips',
      'Live game card with team rows, tabular scores and ESPN+ footer',
      'SportsCenter feed with breaking-news category tags',
      'Status badges (pulsing LIVE, FINAL, start time, Watch on ESPN+)',
      'Winning-team score in green with the loser dimmed',
      'Five-tab bottom bar with a red active-tab dot (Home, Scores, Watch, ESPN BET, More)',
    ],
  },

  'tubi': {
    tagline: 'Build a free, ad-supported streaming app with neon gradient polish',
    blurb:
      'A complete UI blueprint of the Tubi iOS app, documented from a real screen recording down to exact hex values, type weights, and spacing. It captures the indigo-black canvas, the purple-to-magenta brand gradient, the dense free-poster rows, the featured hero, and the Live TV EPG guide so an AI agent can rebuild the experience faithfully.',
    pitch:
      'Use it as the baseline for any free-with-ads streaming product: oversized hero, packed 2:3 poster rails, white Play button, gradient focus states, and continue-watching progress are all specified to exact values. Every color, font weight, radius, motion timing, and the bottom tab structure is documented so you can ship a brand-accurate clone fast.',
    keywords: [
      'tubi clone',
      'tubi ui kit',
      'tubi react native template',
      'build a tubi clone',
      'free streaming app design spec',
    ],
    sector: 'Streaming Video',
    screens: [
      'Home feed with featured hero',
      'Horizontal poster rows',
      'Title detail page',
      'Live TV EPG guide',
      'Search and browse grid',
      'Continue watching shelf',
    ],
  },

  'pluto-tv': {
    tagline: 'Build a free live-TV app centered on a real EPG channel guide',
    blurb:
      'A complete UI blueprint of the Pluto TV iOS app, documented from a real screen recording down to exact hex values, type weights, and grid measurements. It captures the navy canvas, the frozen-frame EPG channel guide, the yellow on-now cell border, the pinned mini-player, and the cable-box category tiers so an AI agent can rebuild the experience faithfully.',
    pitch:
      'Use it as the baseline for any free linear-TV or live-streaming product: a frozen channel column, a sticky 30-minute time-bar, a horizontally-scrolling program timeline, and a pinned mini-player are all specified to exact values. Every color, font weight, radius, motion timing, and the bottom tab structure is documented so you can ship a brand-accurate clone fast.',
    keywords: [
      'pluto tv clone',
      'pluto tv ui kit',
      'pluto tv react native template',
      'build a pluto tv clone',
      'live tv epg app design spec',
    ],
    sector: 'Live TV Streaming',
    screens: [
      'Live TV channel guide (EPG)',
      'Pinned mini-player',
      'Category tier filter',
      'Channel detail and schedule',
      'On Demand rails',
      'Search channels and shows',
    ],
  },

  'kick': {
    tagline: 'Build a live-streaming app with a real-time role-colored chat',
    blurb:
      'A complete UI blueprint of the Kick iOS app, documented from a real screen recording down to exact hex values, type weights, and spacing. It captures the near-black canvas, the single electric-green brand color, the video-plus-streamer-bar-plus-chat watch page, and the role-colored chat with badge chips and inline emotes so an AI agent can rebuild the experience faithfully.',
    pitch:
      'Use it as the baseline for any live-streaming or creator product: a 16:9 player, a streamer bar with a green Follow button, and a dense real-time chat panel with mod/sub/VIP color coding are all specified to exact values. Every color, font weight, radius, motion timing, and the bottom tab structure is documented so you can ship a brand-accurate clone fast.',
    keywords: [
      'kick clone',
      'kick ui kit',
      'kick react native template',
      'build a kick clone',
      'live streaming app design spec',
    ],
    sector: 'Live Streaming',
    screens: [
      'Live stream watch page',
      'Real-time chat panel',
      'Streamer bar with follow',
      'Browse live channels grid',
      'Following and clips',
      'Subscribe sheet',
    ],
  },

  'grubhub': {
    tagline: 'A photo-led food delivery marketplace with live order tracking and Grubhub+ Perks',
    blurb:
      'Grubhub leads every restaurant card with wide full-color food photography, a green rating star, and an orange deal line, then flips into a live tracking screen with an ETA window and a step timeline once you order. Grubhub Red drives every action while Orange carries savings and a gold Perks badge marks Grubhub+ restaurants.',
    pitch:
      'Clone the food delivery app where photography sells the restaurant and the ETA is the payoff. This pack ships the exact Grubhub Red, Orange, Perks Gold, and Track Blue tokens with paste-ready SwiftUI, Expo, and Compose components for the restaurant list and the live order-tracking timeline.',
    keywords: [
      'grubhub clone',
      'grubhub ui kit',
      'grubhub react native template',
      'build a grubhub clone',
      'food delivery app design spec',
    ],
    sector: 'Food Delivery',
    screens: [
      'Delivery home with address bar and search',
      'Restaurant list with photo cards and ratings',
      'Restaurant detail with menu and steppers',
      'Bag sheet with quantity steppers and totals',
      'Live order tracking with ETA and timeline',
      'Orders history and saved restaurants',
    ],
  },

  'deliveroo': {
    tagline: 'A mono-teal food delivery app built on photo cards and a floating add button',
    blurb:
      'Deliveroo runs on one unmistakable teal for the kangaroo logo, every button, the rating star and Deliveroo Plus, with deep teal-ink labels on teal fills for legibility. The restaurant feed pairs wide photo cards with a signature delivery-fee pill, and menu rows carry a floating teal plus button hanging off each thumbnail.',
    pitch:
      'Clone the food delivery app with the most disciplined color system in the category. This pack ships the exact Deliveroo Teal and Teal Ink tokens, the fee pill, the floating add button, and the heavy grotesque type with paste-ready SwiftUI, Expo, and Compose components for the restaurant feed and menu.',
    keywords: [
      'deliveroo clone',
      'deliveroo ui kit',
      'deliveroo react native template',
      'build a deliveroo clone',
      'food delivery app design spec',
    ],
    sector: 'Food Delivery',
    screens: [
      'Restaurant feed with address bar and search',
      'Photo restaurant cards with fee pills',
      'Restaurant menu with floating add buttons',
      'Item customize sheet with steppers',
      'Basket and checkout with sticky bar',
      'Live order tracking with rider map',
    ],
  },

  'zomato': {
    tagline: 'A dual delivery and dining app built on a semantic color-coded rating pill',
    blurb:
      'Zomato runs on a rating pill whose color is the score — green for great, amber for average, red for poor — plus an India-mandated veg/non-veg mark and a bordered red ADD button that overlaps each dish photo. A Delivery / Dining Out toggle re-themes the entire restaurant detail screen under a full-bleed hero and a pull-up info card.',
    pitch:
      'Clone the restaurant app that is both food delivery and dining-out discovery. This pack ships the exact Zomato Red, the semantic green/amber/red rating scale, the veg/non-veg mark, the bordered ADD button and the Delivery/Dining toggle with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'zomato clone',
      'zomato ui kit',
      'zomato react native template',
      'build a zomato clone',
      'food delivery app design spec',
    ],
    sector: 'Food Delivery',
    screens: [
      'Restaurant detail with hero and pull-up card',
      'Delivery and Dining Out segmented toggle',
      'Menu with veg marks and bordered ADD buttons',
      'Semantic rating pills on cards and dishes',
      'Cart and checkout with price button',
      'Live order tracking with rider map',
    ],
  },

  'swiggy': {
    tagline: 'Ship an appetite-driving food delivery app with Swiggy-grade polish',
    blurb:
      'A complete UI blueprint of the Swiggy iOS app, documenting the single Swiggy Orange accent, the photo-forward restaurant card with its dark bottom scrim and bold offer text, the green rating chip, and the floating ADD button that morphs into a stepper. Captured from the real product and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any food delivery, restaurant, or quick-commerce app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #FC8019 orange, the #48C479 rating green, the dashed-divider free-delivery footer, the veg and non-veg marks, and the floating cart bar.',
    keywords: [
      'swiggy clone',
      'swiggy ui kit',
      'swiggy react native template',
      'build a swiggy clone',
      'food delivery app design spec',
    ],
    sector: 'Food & Delivery',
    screens: [
      'Sticky location header with address and search pill',
      'Photo-forward restaurant card with scrim and offer overlay',
      'Green rating chip and amber rating variants',
      'Dish row with veg mark and floating ADD button to stepper',
      'Horizontally scrollable filter chip row',
      'Floating orange cart bar above a four-tab bottom bar',
    ],
  },

  'mcdonalds': {
    tagline: 'Ship a bold, deal-driven QSR loyalty app with McDonald’s-grade polish',
    blurb:
      'A complete UI blueprint of the McDonald’s iOS app, documenting the two-color Golden Arches Yellow and McDonald’s Red brand system, the MyMcDonald’s Rewards points hero, the deals grid, and the mobile-order mode selector. Captured from the real product and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any quick-service restaurant, loyalty, or mobile-order app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #FFC72C yellow with its mandatory #1A1A1A text, the #DA291C deal flags, the rewards progress bar, and the elevated yellow Order FAB.',
    keywords: [
      'mcdonalds clone',
      'mcdonalds ui kit',
      'mcdonalds react native template',
      'build a mcdonalds clone',
      'qsr loyalty app design spec',
    ],
    sector: 'Food & Delivery',
    screens: [
      'Personal greeting header with the Golden Arches and a bell',
      'MyMcDonald’s Rewards card with points hero and progress bar',
      'Two-up deals grid with red DEAL and FREE flags',
      'Order-mode selector: Pickup, Curbside, Drive Thru, Delivery',
      'Dashed-border deal coupon with an Add to order pill',
      'Five-slot bottom bar with an elevated yellow Order FAB',
    ],
  },

  'taco-bell': {
    tagline: 'Ship a neon, dark-first build-your-box QSR app with Taco Bell-grade polish',
    blurb:
      'A complete UI blueprint of the Taco Bell iOS app, documenting the purple-to-magenta brand gradient, the violet-tinted dark canvas, the build-your-box customizer with its gradient box-preview hero and numbered step pills, and the Hot Sauce Yellow value highlight. Captured from the real product and distilled into exact tokens an AI agent can build against directly.',
    pitch:
      'Use it as the baseline for any quick-service, customizable-menu, or order-ahead app and skip months of taste calibration. Every value is documented to the exact hex, font weight, corner radius, and motion timing — the #702082 to #C72BC8 gradient, the #0E0A14 purple-black canvas, the #FFC700 yellow, the magenta radios, and the glow-driven box-preview hero.',
    keywords: [
      'taco bell clone',
      'taco bell ui kit',
      'taco bell react native template',
      'build a taco bell clone',
      'qsr customizer app design spec',
    ],
    sector: 'Food & Delivery',
    screens: [
      'Build-your-box customizer with a gradient box-preview hero',
      'Numbered step pills with active gradient and done green states',
      'Customizer option rows with magenta radios and steppers',
      'Persistent bottom CTA bar with a live box total',
      'Cravings menu tile with a gradient Add pill',
      'Five-tab bottom bar on a violet-black canvas',
    ],
  },

  'panera': {
    tagline: 'A bakery-cafe ordering app where food photos sell and MyPanera rewards drive every visit',
    blurb:
      'Panera leads with appetizing full-color soup, sandwich and salad photo cards on a bakery-warm cream canvas, with a single Panera Green action color carrying every Add to Order and checkout. A green-gradient MyPanera rewards card with a progress bar and Unlimited Sip Club status sits at the top of Home as the loyalty engine.',
    pitch:
      'Clone the warm bakery-cafe ordering experience where photography carries the menu and loyalty carries retention. This pack ships the exact Panera Green, warm cream and gold-star tokens with the rewards card, photo menu rows, quantity stepper, pickup/delivery toggle and sticky checkout bar as paste-ready SwiftUI, Expo and Compose components.',
    keywords: [
      'panera clone',
      'panera ui kit',
      'panera react native template',
      'build a panera clone',
      'food ordering app design spec',
    ],
    sector: 'Food and Beverage Ordering',
    screens: [
      'Home with MyPanera rewards card and order favorites',
      'Order menu with food photo category rows',
      'Item detail with hero photo and customization',
      'Quantity stepper and add-on customization rows',
      'Cart with pickup or delivery toggle',
      'Rewards and Unlimited Sip Club status',
    ],
  },

  'opentable': {
    tagline: 'A restaurant-reservation app built on a tappable time-slot grid and a single red Reserve action',
    blurb:
      'OpenTable turns every restaurant page into a one-tap booking with a grid of rounded reservation time chips, the recommended slot filled OpenTable Red and off-peak slots annotated with teal Dining Points. A heavy restaurant name, gold review stars, Booked-N-times-today social proof, and a sticky red Reserve bar carry the conversion.',
    pitch:
      'Clone the table-booking marketplace where a slot grid plus social proof drives the reservation. This pack ships the exact OpenTable Red, gold-star and teal-points tokens with the time-slot grid, restaurant detail page, party/date selectors and sticky Reserve bar as paste-ready SwiftUI, Expo and Compose components.',
    keywords: [
      'opentable clone',
      'opentable ui kit',
      'opentable react native template',
      'build an opentable clone',
      'restaurant reservation app design spec',
    ],
    sector: 'Restaurant Reservations',
    screens: [
      'Discover search with date, time and party',
      'Restaurant results list with slot chips',
      'Restaurant detail with hero photo and reviews',
      'Reservation time-slot grid with points',
      'Party-size and date selector sheets',
      'Reservations and Dining Rewards points',
    ],
  },

  'resy': {
    tagline: 'A black-first editorial reservation app where a serif name and a red-outlined slot grid drive the booking',
    blurb:
      'Resy is dark-first by design: full-color restaurant photography and high-contrast Playfair-style serif names pop on a pure-black canvas like a printed dining magazine. Available reservation slots are outlined in Resy Red while the primary slot is solid red, and sold-out times become dashed amber Notify chips that join the waitlist.',
    pitch:
      'Clone the editorial table-booking app where typographic and photographic contrast replace color and Notify turns sold-out tables into a waitlist. This pack ships the exact pure-black, Resy Red, amber and gold tokens with the serif/sans split, the red-outline slot grid, the date strip and the Notify path as paste-ready SwiftUI, Expo and Compose components.',
    keywords: [
      'resy clone',
      'resy ui kit',
      'resy react native template',
      'build a resy clone',
      'restaurant reservation app design spec',
    ],
    sector: 'Restaurant Reservations',
    screens: [
      'Editorial search and curated Hit List',
      'Restaurant detail with photo carousel and serif name',
      'Reservation date strip and time-slot grid',
      'Red-outlined slots with seating types',
      'Notify waitlist for sold-out tables',
      'Reservations and confirmation card',
    ],
  },

  'yelp': {
    tagline: 'Local business reviews where the photo, the five stars, and the review wall are the product',
    blurb:
      'A faithful Yelp-inspired design system built around the business detail page: a full-bleed photo header, a warm orange-red five-star rating, and a wall of Recommended Reviews with Useful, Funny, and Cool votes. One rationed Yelp Red drives every primary action while green and red signal open or closed.',
    pitch:
      'Clone the local discovery app where a star rating plus a review count is the entire decision. This pack ships the exact Yelp Red and orange-star tokens, the photo-led business header, the half-star rating control, the review card with vote actions, and category filter chips with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'yelp clone',
      'yelp ui kit',
      'yelp react native template',
      'build a yelp clone',
      'local reviews app design spec',
    ],
    sector: 'Local Discovery and Reviews',
    screens: [
      'Business detail with full-bleed photo header',
      'Recommended Reviews wall with vote actions',
      'Search results with star-rated business rows',
      'Map view with rating price pins',
      'Write a Review with the star rating input',
      'Category filters and the Nearby grid',
    ],
  },

  'chime': {
    tagline: 'Calm mobile banking where the mint balance hero and instant alerts carry the trust',
    blurb:
      'A faithful Chime-inspired design system built around the account home: a full mint-gradient balance hero, a SpotMe fee-free-overdraft banner, and instant transaction alerts the moment money moves. Mint is the entire brand personality and everyday spending stays neutral ink, never alarming red.',
    pitch:
      'Clone the friendly neobank where one number — what you can spend right now — is the whole screen. This pack ships the exact Chime Mint palette, the gradient balance hero with superscript cents, the SpotMe banner, the slide-down instant alert, and status chips with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'chime clone',
      'chime ui kit',
      'chime react native template',
      'build a chime clone',
      'neobank app design spec',
    ],
    sector: 'Fintech and Mobile Banking',
    screens: [
      'Account home with the mint balance hero',
      'SpotMe banner and overdraft detail',
      'Recent activity transaction list',
      'Instant transaction alert toast',
      'Move money and Pay anyone flow',
      'Grow savings and direct deposit',
    ],
  },

  'sofi': {
    tagline: 'A dark-native all-in-one money platform where the gradient net-worth hero leads',
    blurb:
      'A faithful SoFi-inspired design system built around the member home: a blue-to-navy gradient hero carrying net worth, a consolidated account and product tile grid, and cross-sell cards for banking, investing, and borrowing. Electric blue on deep navy is a dark-native brand and performance is color-coded gain-green, loss-coral, rewards-gold.',
    pitch:
      'Clone the premium one-stop fintech where banking, investing, and loans live on one screen. This pack ships the exact SoFi Blue and navy palette, the signature member-hero gradient, the account tile grid, pill buttons, and cross-sell product cards with paste-ready SwiftUI, Expo, and Compose components.',
    keywords: [
      'sofi clone',
      'sofi ui kit',
      'sofi react native template',
      'build a sofi clone',
      'fintech super app design spec',
    ],
    sector: 'Fintech and Wealth',
    screens: [
      'Member home with the gradient net-worth hero',
      'Account and product tile grid',
      'Invest dashboard with performance chips',
      'Cross-sell product cards carousel',
      'Transfer and invest amount entry',
      'Recent activity and rewards',
    ],
  },

  'monzo': {
    tagline: 'Hot Coral card, Pots, and the emoji transaction feed that defines mobile banking',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Monzo iOS, built around the Hot Coral debit-card hero and the day-grouped emoji transaction feed. Real navy-and-coral palette, Inter type scale with tabular figures, Pots, and rich transaction rows.',
    pitch:
      'Everything you need to ship a Monzo-grade neobank front end: exact hex values, the coral card flip, Pot coins with savings goals, and a feed-as-interface pattern. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'monzo clone',
      'monzo ui kit',
      'monzo react native template',
      'build a monzo clone',
      'neobank app design spec',
    ],
    sector: 'Fintech and Banking',
    screens: [
      'Home with Hot Coral card hero',
      'Pots savings strip',
      'Emoji transaction feed',
      'Rich transaction detail',
      'Send money flow',
      'Trends and spending breakdown',
    ],
  },

  'nubank': {
    tagline: 'Nu Purple hero, calm tile stack, and the Roxinho card that defines Latin American fintech',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Nubank iOS, built around the full-bleed Nu Purple hero header and a calm stack of account and credit tiles. Real purple palette, Inter type scale with tabular figures, quick actions, and the Roxinho card.',
    pitch:
      'Everything you need to ship a Nubank-grade neobank front end: exact hex values, the purple hero, NuConta balance tile, credit-card invoice with limit bar, and pill buttons. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'nubank clone',
      'nubank ui kit',
      'nubank react native template',
      'build a nubank clone',
      'neobank app design spec',
    ],
    sector: 'Fintech and Banking',
    screens: [
      'Home with purple hero header',
      'NuConta balance tile',
      'Quick actions strip',
      'Credit-card invoice tile',
      'Pix send flow',
      'Activity feed',
    ],
  },

  'acorns': {
    tagline: 'Oak purple and Acorn Green, the allocation donut, Round-Ups, and Found Money',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Acorns iOS, built around the friendly Invest dashboard: portfolio total, the multi-segment allocation donut, and the purple Round-Ups card. Real dual-brand palette, heavy rounded Nunito Sans type with tabular figures.',
    pitch:
      'Everything you need to ship an Acorns-grade micro-investing front end: exact hex values, the sweeping allocation donut, Round-Ups gradient card, Found Money cashback feed, and pill buttons. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'acorns clone',
      'acorns ui kit',
      'acorns react native template',
      'build an acorns clone',
      'micro-investing app design spec',
    ],
    sector: 'Fintech and Investing',
    screens: [
      'Invest dashboard with portfolio total',
      'Allocation donut and legend',
      'Round-Ups card',
      'Found Money cashback feed',
      'One-time invest flow',
      'Growth projection',
    ],
  },

  'fidelity': {
    tagline: 'Institutional calm where the total account value and a sticky Trade button lead',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from the Fidelity iOS app, built around the Summary spine: the huge tabular account-value hero, a green/red day-change line, a sparkline with range tabs, and the watchlist row list. Captured from a real screen recording into exact Fidelity Green and Heritage Green hex, calm evergreen dark surfaces, and tabular numerals, ready for an AI agent to build against.',
    pitch:
      'Use it as the baseline to ship a Fidelity-grade brokerage front end: the portfolio-to-quote-to-trade drill path, sticky green Trade bar, sparkline plus 1D/1W/1M/1Y range tabs, and flat hairline holding rows. Everything is documented to exact values — `#368727` brand, `#00754A` heritage, sacred gain `#15B374` / loss `#E5544B`, the `#0E1411` dark canvas, tabular money, radius scale, and motion — with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'fidelity clone',
      'fidelity ui kit',
      'fidelity react native template',
      'build a fidelity clone',
      'brokerage app design spec',
    ],
    sector: 'Fintech and Investing',
    screens: [
      'Account summary with the tabular value hero',
      'Sparkline and 1D/1W/1M/1Y range tabs',
      'Watchlist and holdings rows',
      'Stock quote screen with sticky Trade',
      'Trade ticket and order preview',
      'Asset allocation ring and balances',
    ],
  },

  'charles-schwab': {
    tagline: 'A confident brokerage where the navy total-value hero and trade ticket lead',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from the Charles Schwab iOS app, built around the account spine: a navy gradient Total Value hero, a stacked accounts list with balances and percent change, and the segmented Buy/Sell trade ticket. Captured from a real screen recording into exact Schwab Blue and Schwab Navy hex, maritime-navy dark surfaces, and tabular numerals, ready for an AI agent to build against.',
    pitch:
      'Use it as the baseline to ship a Schwab-grade brokerage front end: the accounts-to-quote-to-trade spine, the trade-ticket centerpiece with right-aligned tabular fields and an estimated-cost card, balances tiles, and a sticky Trade bar. Everything is documented to exact values — `#009DDC` Schwab Blue with dark-navy on-color text, `#003B5C` navy hero gradient, sacred gain `#18B07B` / loss `#E2564E`, the `#0A1622` dark canvas, tabular money, radius scale, and motion — with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'charles schwab clone',
      'charles schwab ui kit',
      'charles schwab react native template',
      'build a charles schwab clone',
      'brokerage app design spec',
    ],
    sector: 'Fintech and Investing',
    screens: [
      'Accounts list with the navy value hero',
      'Account detail with positions and balances',
      'Stock quote screen with sticky Trade',
      'Segmented Buy and Sell trade ticket',
      'Order review and confirmation',
      'Balances tiles and activity',
    ],
  },

  'webull': {
    tagline: 'A dark-native trading terminal where the candlestick chart and order ladder lead',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from the Webull iOS app, built around the quote spine: a colored tabular last price, a full-bleed candlestick chart with a timeframe strip, the bid/ask order-book ladder, and a watchlist of sparkline rows. Captured from a real screen recording into the exact Webull blue→cyan gradient, near-black terminal canvas, and pervasive up/down color, ready for an AI agent to build against.',
    pitch:
      'Use it as the baseline to ship a Webull-grade trading terminal: the quotes-to-chart-to-trade spine, candlestick chart with indicators, the depth-bar order ladder, the options chain, and the split Buy/Sell docked pair. Everything is documented to exact values — `#1B9EFB → #20D5C4` brand gradient, the `#0B0E11` dark-native canvas, sacred up `#00C076` / down `#FA5252`, the cyan PAPER badge, region-aware up/down, tabular money, radius scale, and motion — with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'webull clone',
      'webull ui kit',
      'webull react native template',
      'build a webull clone',
      'stock trading app design spec',
    ],
    sector: 'Fintech and Trading',
    screens: [
      'Stock quote with the colored last price',
      'Full-bleed candlestick chart and timeframes',
      'Bid and ask order-book ladder',
      'Watchlist with sparkline rows',
      'Options chain table',
      'Buy and Sell order ticket',
    ],
  },

  'binance': {
    tagline: 'A dark trading terminal where one yellow accent and absolute green-red carry every market',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Binance iOS, built around the dense markets list and the candlestick trade screen with its depth-shaded order book. Real near-black canvas, single Binance Yellow accent, and monospace tabular figures so every price column aligns.',
    pitch:
      'Everything you need to ship a Binance-grade exchange front end: exact hex values, the dense markets list with colored percentage pills, the translucent depth order book, the green and red Buy/Sell ticket, and the single-screen Convert flow. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'binance clone',
      'binance ui kit',
      'binance react native template',
      'build a binance clone',
      'crypto exchange app design spec',
    ],
    sector: 'Fintech and Crypto Exchange',
    screens: [
      'Markets list with favorites and spot tabs',
      'Candlestick chart with interval chips',
      'Depth-shaded order book',
      'Buy and Sell trade ticket',
      'Convert from-to swap flow',
      'Wallet and funding overview',
    ],
  },

  'crypto-com': {
    tagline: 'A premium navy super-app where the metallic Visa card is the whole status symbol',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Crypto.com iOS, built around the navy-tinted home: the total-balance hero, the tiered metallic Visa card, and the watchlist. Real two-blue system, brushed-metal card gradients, and Roboto Mono money so every column aligns.',
    pitch:
      'Everything you need to ship a Crypto.com-grade fintech super-app: exact hex values, the brushed-metal Visa card with gold embossing and tier-to-cashback mapping, the floating center Trade tab, the Earn APR rows, and pill CTAs. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'crypto.com clone',
      'crypto.com ui kit',
      'crypto.com react native template',
      'build a crypto.com clone',
      'crypto super app design spec',
    ],
    sector: 'Fintech and Crypto',
    screens: [
      'Home with total-balance hero',
      'Metallic Visa card and tiers',
      'Watchlist and prices list',
      'Buy and Sell trade flow',
      'Earn APR and staking',
      'Card management and cashback',
    ],
  },

  'fitbit': {
    tagline: 'A supportive health dashboard where every metric owns a color and the big number is the hero',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Fitbit iOS, built around the Today dashboard: the steps ring hero, the metric tile grid, the Sleep score, and Daily Readiness. Real teal-black canvas, a per-metric color system, and warm DM Sans coaching copy.',
    pitch:
      'Everything you need to ship a Fitbit-grade health app: exact hex values, the sweeping steps progress ring, color-coded metric tiles, the 0-100 Sleep and Daily Readiness scores, and pill CTAs with ring-sweep and count-up motion. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'fitbit clone',
      'fitbit ui kit',
      'fitbit react native template',
      'build a fitbit clone',
      'health and fitness app design spec',
    ],
    sector: 'Health and Fitness',
    screens: [
      'Today dashboard with steps ring hero',
      'Metric tile grid',
      'Sleep score and stages',
      'Daily Readiness card',
      'Heart rate detail chart',
      'Activity and goal logging',
    ],
  },

  'garmin-connect': {
    tagline: 'True-black canvas, single Garmin Blue accent, glowing GPS route and condensed metrics',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Garmin Connect iOS, built around the activity detail screen: a glowing GPS route on a dark map, a tight stat grid, Training Status, Body Battery, and color-coded heart-rate zones. Real single-accent palette on true black with Roboto plus Roboto Condensed tabular numerals.',
    pitch:
      'Everything you need to ship a Garmin-grade fitness data cockpit: exact hex values, the glowing route line, the condensed stat grid, Training Status ring, Body Battery gauge, and the green-to-red HR-zone ramp. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'garmin connect clone',
      'garmin connect ui kit',
      'garmin connect react native template',
      'build a garmin connect clone',
      'fitness tracking app design spec',
    ],
    sector: 'Health and Fitness',
    screens: [
      'Activity detail with GPS route map',
      'Stat grid (pace, HR, elevation)',
      'Training Status ring',
      'Body Battery gauge',
      'Heart rate zones breakdown',
      'My Day dashboard tiles',
    ],
  },

  'peloton': {
    tagline: 'Pure-black studio canvas, single Peloton Red accent, the LIVE badge and output ring',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Peloton iOS, built around class browse and the in-class metrics screen: cinematic class cards, the pulsing red LIVE badge, the big output ring, and a real-time leaderboard with your row washed in red. Real single-accent palette on pure black with Inter set heavy and tabular.',
    pitch:
      'Everything you need to ship a Peloton-grade boutique fitness front end: exact hex values, the cinematic class card, the pulsing LIVE badge, the in-class output ring, fixed metric colors, and the live reordering leaderboard. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'peloton clone',
      'peloton ui kit',
      'peloton react native template',
      'build a peloton clone',
      'fitness streaming app design spec',
    ],
    sector: 'Health and Fitness',
    screens: [
      'Class browse with cinematic cards',
      'Live class with LIVE badge',
      'In-class output ring',
      'Live metric column',
      'Real-time leaderboard',
      'Class detail with instructor',
    ],
  },

  'apple-fitness': {
    tagline: 'True-black canvas with the three Activity rings as the entire brand identity',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Apple Fitness iOS, built around the Summary tab: the three glowing Activity rings, a grid of grouped metric tiles, and a cinematic Fitness+ artwork shelf. Real ring palette (Move, Exercise, Stand) on true black with SF Pro and Apple’s label-opacity ramp.',
    pitch:
      'Everything you need to ship an Apple-Fitness-grade activity front end: exact ring hex values, the three-ring stack on 22 percent tracks, grouped system cards, frosted Fitness+ overlays, and the Move-pink chrome accent. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'apple fitness clone',
      'apple fitness ui kit',
      'apple fitness react native template',
      'build an apple fitness clone',
      'activity tracking app design spec',
    ],
    sector: 'Health and Fitness',
    screens: [
      'Summary tab with Activity rings',
      'Ring hero card and legend',
      'Metric tile grid',
      'Fitness+ artwork shelf',
      'Ring detail and history',
      'In-workout ring HUD',
    ],
  },

  'hevy': {
    tagline: 'Hevy Blue on a near-black gym canvas, the set table, rest timer, and gold PR badges',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Hevy iOS, built around the live workout log: a dense set table with tabular figures, the auto-starting rest-timer pill, and the gold PR badge that fires on a record. Real single-accent palette, Inter type tuned for arm’s-length reading under a barbell.',
    pitch:
      'Everything you need to ship a Hevy-grade workout logger front end: exact hex values, the Set/Previous/kg/Reps table, the sweeping rest-timer ring, set-done green wash, and gold PR badges. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'hevy clone',
      'hevy ui kit',
      'hevy react native template',
      'build a hevy clone',
      'workout tracker app design spec',
    ],
    sector: 'Fitness and Workout Tracking',
    screens: [
      'Workout in progress with set table',
      'Rest-timer pill countdown',
      'Gold PR badge on a set',
      'Post-workout summary',
      'Exercise history and 1RM chart',
      'Strava-style friends feed',
    ],
  },

  'strong': {
    tagline: 'Strong Blue on flat neutral dark, the set-log table, slim rest bar, and amber PR flags',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Strong iOS, built around its famously minimal set-log table: tabular-figure cells, the Previous column, a slim auto-running rest-timer bar, and flat borderless exercise cards. Real single-accent palette with neutral-grey surfaces and Inter type tuned for arm’s-length reading.',
    pitch:
      'Everything you need to ship a Strong-grade workout logger front end: exact hex values, the Set/Previous/kg/Reps grid, the slim rest-timer progress bar, set-done green fill, and the amber PR flag. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'strong clone',
      'strong ui kit',
      'strong react native template',
      'build a strong clone',
      'workout tracker app design spec',
    ],
    sector: 'Fitness and Workout Tracking',
    screens: [
      'Workout log with set table',
      'Slim rest-timer bar',
      'Amber PR flag on a set',
      'Workout history calendar',
      'Exercise library with muscle map',
      'Post-workout summary',
    ],
  },

  'zwift': {
    tagline: 'Zwift Orange over a full-bleed 3D world, glass HUD tiles, and fixed metric color semantics',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Zwift iOS, built around the ride HUD: glassmorphic metric tiles over a rendered virtual world, the orange route-progress banner, and the Power-Up game tile. Real brand palette with the fixed Power/Cadence/HR/W-kg color mapping and tall condensed Barlow numerals.',
    pitch:
      'Everything you need to ship a Zwift-grade virtual-cycling front end: exact hex values, the glass rider HUD, the route banner with progress bar, the armed Power-Up tile, and achievement bursts. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'zwift clone',
      'zwift ui kit',
      'zwift react native template',
      'build a zwift clone',
      'virtual cycling app design spec',
    ],
    sector: 'Fitness and Virtual Cycling',
    screens: [
      'Ride HUD over a 3D world',
      'Route banner with progress bar',
      'Armed Power-Up tile',
      'Route picker and worlds',
      'Structured workout interval graph',
      'Achievement and level-up burst',
    ],
  },

  'sleep-cycle': {
    tagline: 'Indigo night gradient, the glowing hypnogram wave, sleep-quality ring, and smart alarm',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Sleep Cycle iOS, built around the signature sleep-analysis graph: a smooth glowing aqua wave over color-coded stages, the sleep-quality ring, and the smart-alarm card. Real night-gradient palette, heavy rounded Nunito numerals on a deep low-glare canvas.',
    pitch:
      'Everything you need to ship a Sleep Cycle-grade sleep tracker front end: exact hex values, the bezier hypnogram with stage colors, the score-banded quality ring, the smart-alarm wake window, and the colored-glow primary button. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'sleep cycle clone',
      'sleep cycle ui kit',
      'sleep cycle react native template',
      'build a sleep cycle clone',
      'sleep tracker app design spec',
    ],
    sector: 'Health and Sleep',
    screens: [
      'Sleep analysis with hypnogram wave',
      'Sleep-quality ring and hero stat',
      'Smart alarm wake window',
      'Weekly sleep trends',
      'Soundscape sleep-aid player',
      'Sleep journal calendar',
    ],
  },

  'noom': {
    tagline: 'Noom Blue and Teal, the daily psychology lesson card, and the green/yellow/red food log',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Noom iOS, built around its two signatures: the bold blue-to-teal daily psychology lesson card and the food log driven by the green/yellow/red food-color system. Real dual-brand palette, friendly geometric Poppins type, fully pill-shaped buttons.',
    pitch:
      'Everything you need to ship a Noom-grade behavior-change front end: exact hex values, the gradient lesson card, the sacred green/yellow/red food-color mechanic, the stacked food-ratio bar, the weight graph with a teal goal line, and the Coach Purple chat surface. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'noom clone',
      'noom ui kit',
      'noom react native template',
      'build a noom clone',
      'weight loss app design spec',
    ],
    sector: 'Health and Weight Loss',
    screens: [
      'Today feed with daily lesson card',
      'Food log with color system',
      'Stacked food-ratio bar',
      'Weight graph with goal line',
      'Coach chat surface',
      'Psychology lesson reader',
    ],
  },

  'runna': {
    tagline: 'Runna Indigo and electric Lime, the color-coded plan week strip, and the guided run card',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Runna iOS, built around its two signatures: the color-coded training-plan week strip and the Indigo guided run-session card with its workout-structure breakdown and pace targets. Real two-color brand system, athletic Sora type, an Indigo-tinted dark canvas.',
    pitch:
      'Everything you need to ship a Runna-grade structured-training front end: exact hex values, the seven-cell plan week strip, the guided run-session gradient card, the warm-up to cooldown structure bar, the fixed run-type color system, and the Lime go button. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'runna clone',
      'runna ui kit',
      'runna react native template',
      'build a runna clone',
      'running training app design spec',
    ],
    sector: 'Health and Running',
    screens: [
      'Training plan with week strip',
      'Guided run-session card',
      'Workout-structure breakdown',
      'Live guided run screen',
      'Run summary with splits',
      'Progress and pace trends',
    ],
  },

  'asana': {
    tagline: 'Clone Asana iOS down to the coral accent, completion circle, and status pills',
    blurb:
      'A production-grade design spec reverse-engineered from the Asana iOS app. Exact hex codes, Inter type scale, the delightful tap-to-complete circle, and the multicolor object palette.',
    pitch:
      'Ship an Asana-quality task manager without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'asana clone',
      'asana ui kit',
      'asana react native template',
      'build an asana clone',
      'project management app design spec',
    ],
    sector: 'Project Management',
    screens: [
      'My Tasks list with completion circles',
      'Sectioned task groups (Today / Upcoming)',
      'Project board (Kanban) view',
      'Project status update card',
      'Inbox notification feed',
      'Task detail with subtasks',
    ],
  },

  'monday': {
    tagline: 'Clone the monday.com colorful board down to full-bleed status cells and group stripes',
    blurb:
      'A production-grade design spec reverse-engineered from the monday.com iOS app. Exact hex codes, Figtree type scale, the full-bleed saturated status system, and the multicolor data palette.',
    pitch:
      'Ship a monday.com-quality work OS without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'monday.com clone',
      'monday.com ui kit',
      'monday.com react native template',
      'build a monday.com clone',
      'work management app design spec',
    ],
    sector: 'Work Management',
    screens: [
      'Colorful grouped board (Main Table)',
      'Full-bleed status column cells',
      'Kanban board view',
      'Battery progress rollup',
      'Item detail with updates feed',
      'Inbox notification feed',
    ],
  },

  'clickup': {
    tagline: 'Clone ClickUp iOS down to the brand gradient, squircle FAB, and custom status pills',
    blurb:
      'A production-grade design spec reverse-engineered from the ClickUp iOS app. Exact hex codes, Plus Jakarta Sans type scale, the 3-stop brand gradient, and the dense custom-status task system.',
    pitch:
      'Ship a ClickUp-quality productivity app without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'clickup clone',
      'clickup ui kit',
      'clickup react native template',
      'build a clickup clone',
      'productivity app design spec',
    ],
    sector: 'Productivity',
    screens: [
      'Custom-status grouped task list',
      'ClickUp AI bar and surfaces',
      'Board (Kanban) view',
      'Squircle gradient FAB',
      'Task detail panel with subtasks',
      'Inbox notification feed',
    ],
  },

  'jira': {
    tagline: 'Ship the Jira board, issue cards, and sprint backlog with exact Atlassian tokens',
    blurb:
      'A complete UI blueprint of the Jira iOS app — the sprint board, issue cards, status lozenges, issue detail, and backlog — documented from a real screen recording. Every Atlassian color token, type ramp, lozenge pair, and elevation level is captured so an AI agent can rebuild it screen for screen.',
    pitch:
      'Use it as the baseline for any project-tracking or work-management app: drag-to-transition boards, semantic status lozenges, issue-type iconography, and a field-panel issue detail. Jira Blue #0052CC, Atlassian Navy #172B4D ink, the #1D2125 dark canvas, and tabular-numeral story points are all specified to exact values.',
    keywords: [
      'jira clone',
      'jira ui kit',
      'jira react native template',
      'build a jira clone',
      'project management app design spec',
    ],
    sector: 'Project Management',
    screens: [
      'Sprint board with horizontal status columns',
      'Issue card with type icon, key, labels and points',
      'Issue detail with status lozenge and field panel',
      'Backlog list with collapsible sprint sections',
      'Status transition dropdown menu',
      'Create issue modal sheet',
    ],
  },

  'evernote': {
    tagline: 'Build the Evernote note editor, list, and notebooks with exact brand-green tokens',
    blurb:
      'A complete UI blueprint of the Evernote iOS app — the note editor, note list, notebooks and stacks, tag pills, and capture FAB — documented from a real screen recording. Every brand-green token, reading-comfort type ramp, checklist behavior, and elevation level is captured so an AI agent can rebuild it screen for screen.',
    pitch:
      'Use it as the baseline for any note-taking or knowledge-capture app: a chrome-free rich editor, scannable note list, notebook-and-stack organization, and a raised green capture FAB. Evernote Green #00A82D, warm ink #1C2B33, the true near-black #1C1C1E dark canvas, and the 1.6 reading line-height are all specified to exact values.',
    keywords: [
      'evernote clone',
      'evernote ui kit',
      'evernote react native template',
      'build an evernote clone',
      'note-taking app design spec',
    ],
    sector: 'Notes & Productivity',
    screens: [
      'Note editor with title, tags and checklist',
      'Format toolbar docked above the keyboard',
      'Note list with snippet and thumbnail rows',
      'Notebooks and stacks organization screen',
      'Capture sheet from the green FAB',
      'Full-text search with scoped filters',
    ],
  },

  'bear': {
    tagline: 'Clone Bear: live-Markdown editor with hashtag organization and a charcoal canvas',
    blurb:
      'A complete UI blueprint of the Bear iOS notes app, captured from a real screen recording and documented down to exact hex, type and spacing. It covers the live-Markdown editor, inline #hashtag tokens, the tag sidebar, checkboxes, quotes and code blocks so an AI agent can rebuild the app faithfully.',
    pitch:
      'Use it as the baseline for a focused Markdown note-taking app: the charcoal canvas (#21252B), the single red-to-orange brand gradient (#E0566F to #FF8A65), Bear Orange interactive glyphs (#FF8A65) and the three switchable type families are all documented to exact values. Every signature behaviour — in-place Markdown rendering, the hashtag filing system and the compose FAB — is specified for SwiftUI, Expo and Jetpack Compose.',
    keywords: [
      'bear clone',
      'bear ui kit',
      'bear react native template',
      'build a bear clone',
      'markdown notes app design spec',
    ],
    sector: 'Notes and Writing',
    screens: [
      'Note editor with live Markdown',
      'Tag sidebar (hashtag tree)',
      'Note list with previews',
      'Checkbox and todo lines',
      'Quote and code blocks',
      'Export and theme picker',
    ],
  },

  'craft': {
    tagline: 'Clone Craft iOS down to the blue-purple gradient, card blocks, and Daily Note',
    blurb:
      'A production-grade design spec reverse-engineered from the Craft iOS docs app. Exact hex codes, the signature blue-to-purple gradient, card-forward blocks with soft shadows, and the editorial Inter type scale.',
    pitch:
      'Ship a Craft-quality block document editor without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'craft clone',
      'craft ui kit',
      'craft react native template',
      'build a craft clone',
      'document editor app design spec',
    ],
    sector: 'Docs and Notes',
    screens: [
      'Document editor with cover and emoji hero',
      'Card blocks (nested page, link, toggle)',
      'To-do block with tap-to-complete',
      'Daily Note auto-created card',
      'Slash block inserter menu',
      'Bottom bar with center gradient FAB',
    ],
  },

  'miro': {
    tagline: 'Clone Miro iOS down to Miro Yellow, the infinite canvas, and sticky notes',
    blurb:
      'A production-grade design spec reverse-engineered from the Miro iOS whiteboard app. Exact hex codes, the infinite pinch-zoom canvas, paper sticky notes, the floating toolbar, and Miro Blue selection.',
    pitch:
      'Ship a Miro-quality infinite-canvas whiteboard without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'miro clone',
      'miro ui kit',
      'miro react native template',
      'build a miro clone',
      'whiteboard app design spec',
    ],
    sector: 'Collaboration Whiteboard',
    screens: [
      'Infinite canvas with dotted grid',
      'Sticky notes with selection box',
      'Floating creation toolbar',
      'Connectors and dashed frames',
      'Live multiplayer cursors',
      'Zoom pill and board navigation',
    ],
  },

  'canva': {
    tagline: 'Clone Canva: gradient design home, template galleries and a one-tap create flow',
    blurb:
      'A complete UI blueprint of the Canva iOS design app, captured from a real screen recording and documented down to exact hex, type and spacing. It covers the personalized home, design-type tiles, template galleries, the gradient create FAB and the editor chrome so an AI agent can rebuild the app faithfully.',
    pitch:
      'Use it as the baseline for a friendly template-driven design tool: the cyan-to-purple brand gradient (#00C4CC to #7D2AE8), the warm-neutral dark canvas (#18191B), gold Pro accents (#FFC24B) and Plus Jakarta Sans display weights are all documented to exact values. Every signature surface — the centered lifted create FAB, the design-type tile rail and the slide-up bottom sheets — is specified for SwiftUI, Expo and Jetpack Compose.',
    keywords: [
      'canva clone',
      'canva ui kit',
      'canva react native template',
      'build a canva clone',
      'design tool app design spec',
    ],
    sector: 'Design and Creativity',
    screens: [
      'Personalized home feed',
      'Design-type tile rail',
      'Template galleries grid',
      'Create-a-design bottom sheet',
      'Design editor with tool rail',
      'Pro upsell sheet',
    ],
  },

  'grammarly': {
    tagline: 'Clone Grammarly iOS down to the green accent, score ring, and category underlines',
    blurb:
      'A production-grade design spec reverse-engineered from the Grammarly iOS app. Exact hex codes, Inter type scale, the slide-up suggestion card, color-coded category underlines, and the animated document score ring.',
    pitch:
      'Ship a Grammarly-quality writing assistant without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'grammarly clone',
      'grammarly ui kit',
      'grammarly react native template',
      'build a grammarly clone',
      'writing assistant app design spec',
    ],
    sector: 'Writing & Productivity',
    screens: [
      'Editor with color-coded suggestion underlines',
      'Slide-up suggestion card with accept and dismiss',
      'Document score ring in the top bar',
      'Tone detector row with tone pills',
      'Assistant bar with running suggestion count',
      'Weekly writing insights with productivity rings',
    ],
  },

  'coffee-meets-bagel': {
    tagline: 'Clone Coffee Meets Bagel iOS down to the brew brown, bagel orange, and curated card',
    blurb:
      'A production-grade design spec reverse-engineered from the Coffee Meets Bagel iOS app. Exact hex codes, Poppins type scale, the one-at-a-time Today’s Bagel card, the oversized Like action, and the cozy coffee-house palette.',
    pitch:
      'Ship a Coffee Meets Bagel-quality curated dating app without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'coffee meets bagel clone',
      'coffee meets bagel ui kit',
      'coffee meets bagel react native template',
      'build a coffee meets bagel clone',
      'dating app design spec',
    ],
    sector: 'Dating & Social',
    screens: [
      'Today’s Bagels curated card stack',
      'Profile detail with prompt blocks',
      'Pass, Like, and Send a Bagel action trio',
      'It’s a match takeover with bagel confetti',
      'Chats list with unread dots',
      'Beans store and premium upsell',
    ],
  },

  'plenty-of-fish': {
    tagline: 'Clone Plenty of Fish: a blue photo-grid dating app with Meet Me and chat',
    blurb:
      'A complete UI blueprint of the Plenty of Fish iOS dating app, captured from a real screen recording and documented down to exact hex, type and spacing. It covers the 2-column match grid, the Meet Me yes/maybe/no card, the online presence system and the messages-first inbox so an AI agent can rebuild the app faithfully.',
    pitch:
      'Use it as the baseline for a photo-grid dating app: POF Blue (#0098DB to #00A6E2), the cool near-black dark canvas (#121417), online teal (#00C9B7), unread pink (#FF4F8B) and heavy rounded Nunito Sans are all documented to exact values. Every signature surface — the full-bleed match grid, the Meet Me card and the prominent Messages tab with its unread badge — is specified for SwiftUI, Expo and Jetpack Compose.',
    keywords: [
      'plenty of fish clone',
      'plenty of fish ui kit',
      'plenty of fish react native template',
      'build a plenty of fish clone',
      'dating app design spec',
    ],
    sector: 'Dating and Social',
    screens: [
      'Match grid (2-column photos)',
      'Meet Me yes/maybe/no card',
      'Profile detail carousel',
      'Messages inbox',
      'Chat conversation',
      'Upgrade / premium sheet',
    ],
  },

  'match': {
    tagline: 'A full-bleed profile-card dating app where one disciplined Match Red drives every swipe',
    blurb:
      'Match is photo-first by design: the entire screen is one person, edge to edge, with a bottom gradient scrim carrying the name, age, job and frosted interest chips. A single disciplined Match Red runs the floating circular action dock, where the solid-red Like button is deliberately the loudest object on screen.',
    pitch:
      'Clone the face-first dating app where the photo IS the interface and one brand red does all the work. This pack ships the exact warm near-black, Match Red and functional-accent tokens with the full-bleed swipe card, the five-button action dock, the blurred Likes You paywall and the It is a Match celebration as paste-ready SwiftUI, Expo and Compose components.',
    keywords: [
      'match clone',
      'match ui kit',
      'match react native template',
      'build a match clone',
      'dating app design spec',
    ],
    sector: 'Dating and Social',
    screens: [
      'Full-bleed Discover profile card with story bars',
      'Floating action dock with the loud red Like',
      'Likes You blurred paywall grid',
      'It is a Match full-screen celebration',
      'Conversation thread and messages list',
      'Profile detail with interests and verification',
    ],
  },

  'the-league': {
    tagline: 'A black-tie members-club dating app where one rationed gold and zero shadows do everything',
    blurb:
      'The League renders an exclusive members club as software: a near-true-black canvas with a single disciplined gold for the crest, hairlines and one CTA, and a display serif that makes every prospect read like an embossed calling card. A concierge hand-curates a finite daily batch and speaks in italic serif notes behind a gold left rule.',
    pitch:
      'Clone the curated, vetted dating app where scarcity is the product and restraint is the brand. This pack ships the exact near-true-black, single-gold and warm-off-white tokens with the no-shadow hairline system, the serif/sans split, the calling-card prospect, the concierge note and the daily batch banner as paste-ready SwiftUI, Expo and Compose components.',
    keywords: [
      'the league clone',
      'the league ui kit',
      'the league react native template',
      'build a the league clone',
      'exclusive dating app design spec',
    ],
    sector: 'Dating and Social',
    screens: [
      'Today batch banner and curated prospect feed',
      'Embossed calling-card prospect with credentials',
      'Verification seal and gold card actions',
      'Concierge note with personal introduction',
      'Matches and conversation thread',
      'Profile with credential dossier sections',
    ],
  },

  'raya': {
    tagline: 'Clone Raya iOS down to the pure-black canvas, slideshow profile, and music ticker',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Raya iOS, built around the music-scored slideshow profile: segmented story bars, a white music ticker with equalizer, and an editorial caption over a black scrim. Uncompromisingly monochrome — pure black and pure white, with no brand color at all.',
    pitch:
      'Everything you need to ship a Raya-grade members-only dating front end: exact monochrome hex values, the auto-advancing slideshow, story-bar scrubbing, the cinematic music ticker, the white-outline Heart, and hairline-only depth. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'raya clone',
      'raya ui kit',
      'raya react native template',
      'build a raya clone',
      'dating app design spec',
    ],
    sector: 'Dating and Social',
    screens: [
      'Slideshow profile with story bars',
      'Music ticker and equalizer',
      'Editorial caption over scrim',
      'Skip / Heart / Note actions',
      'Messages list',
      'Expanded profile with member chips',
    ],
  },

  'feeld': {
    tagline: 'True-black canvas, rationed acid-yellow, the Discover card, and couple-first Desires',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Feeld iOS, built around the dark-native Discover stack: one deeply-rounded profile card, the three-button Pass/Like/Wink row, and the Desire chip system. Real brand palette with acid-yellow #E8FF63 rationed to one action per screen, plus Space Grotesk and Inter typography.',
    pitch:
      'Everything you need to ship a Feeld-grade open-minded dating front end: exact hex values, the full-bleed 28pt Discover card with couple-aware names, the acid Like glow, Desire pill chips in three states, and the Connections list. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'feeld clone',
      'feeld ui kit',
      'feeld react native template',
      'build a feeld clone',
      'dating app design spec',
    ],
    sector: 'Dating and Social',
    screens: [
      'Discover profile card stack',
      'Couple and group profile',
      'Pass, Like, and Wink action row',
      'Desire and identity chip picker',
      'Connections message list',
      'Filter bottom sheet',
    ],
  },

  'happn': {
    tagline: 'The Crossings timeline, the pink Charm heart, location stamps, and the gold Crush',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from happn iOS, built around the signature Crossings timeline: a connector-line feed of location and time-stamped cards with one-tap Charm hearts. Real brand palette with happn pink #FF4865 fading to magenta #E91E63, reserved Crush gold, and warm rounded Poppins type over a graphite canvas.',
    pitch:
      'Everything you need to ship a happn-grade crossed-paths dating front end: exact hex values, the connector-spine timeline with pink crossing counts, the Charm and Crush gestures, teardrop map pins, FlashNote openers, and the gold Crush celebration. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'happn clone',
      'happn ui kit',
      'happn react native template',
      'build a happn clone',
      'dating app design spec',
    ],
    sector: 'Dating and Social',
    screens: [
      'Crossed paths timeline',
      'Connector-line crossing card',
      'Charm and Crush gesture',
      'Map of crossing pins',
      'FlashNote opener',
      'Crush celebration screen',
    ],
  },

  'character-ai': {
    tagline: 'Clone Character.AI iOS down to the tucked-corner bubbles, greeting, and rationed blue',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from Character.AI iOS, built around the immersive chat: a circular character avatar, the centered in-character greeting, and asymmetric bubbles differentiated by a 4pt tucked corner rather than color. Real near-black palette, Sora-for-identity plus Inter-for-message type.',
    pitch:
      'Everything you need to ship a Character.AI-grade conversational AI front end: exact hex values, the asymmetric AI and user bubbles, italic roleplay-action rendering, the dimming-dots typing indicator, the Discover character grid, and the morphing send button. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'character.ai clone',
      'character.ai ui kit',
      'character.ai react native template',
      'build a character.ai clone',
      'ai chat app design spec',
    ],
    sector: 'AI and Chat',
    screens: [
      'Character chat with centered greeting',
      'Asymmetric AI and user bubbles',
      'Italic roleplay actions in a bubble',
      'Dimming-dots typing indicator',
      'Discover character grid',
      'Composer with morphing send button',
    ],
  },

  'midjourney': {
    tagline: 'Clone Midjourney iOS down to the true-black canvas, 2x2 grid, and U1-U4 chip grammar',
    blurb:
      'A production-grade design spec reverse-engineered from the Midjourney iOS app. Exact hex codes, the Inter UI plus monospace-prompt type split, the true-black OLED canvas, and the Discord-heritage upscale/variation chip system.',
    pitch:
      'Ship a Midjourney-quality image-generation app without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'midjourney clone',
      'midjourney ui kit',
      'midjourney react native template',
      'build a midjourney clone',
      'ai image generation app design spec',
    ],
    sector: 'AI Image Generation',
    screens: [
      'Create feed with prompt bar',
      '2x2 job grid with U1-U4 chips',
      'Render-progress shimmer placeholder',
      'Parameter helper strip (--ar, --v)',
      'Full-screen image lightbox',
      'Explore community masonry',
    ],
  },

  'deepseek': {
    tagline: 'Clone DeepSeek iOS down to the reasoning trace, whale mark, and single-blue accent',
    blurb:
      'A production-grade design spec reverse-engineered from the DeepSeek iOS app. Exact hex codes, the system-sans type scale, the recessed reasoning-trace panel, and the DeepThink/Search toggle pair.',
    pitch:
      'Ship a DeepSeek-quality reasoning chat app without guessing a single token. Includes SwiftUI, Expo, and Jetpack Compose implementation guides plus a live iPhone preview.',
    keywords: [
      'deepseek clone',
      'deepseek ui kit',
      'deepseek react native template',
      'build a deepseek clone',
      'ai chat assistant app design spec',
    ],
    sector: 'AI Assistant',
    screens: [
      'Chat with inline reasoning trace',
      'Collapsible chain-of-thought panel',
      'DeepThink (R1) / Search toggle composer',
      'Streaming answer with live duration',
      'Web-search citation source sheet',
      'Empty state with example prompts',
    ],
  },

  'github': {
    tagline: 'Clone GitHub iOS down to Primer dark, the reserved green, and the contributions heatmap',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from GitHub iOS (the Primer design system on mobile), built around the repo home and code browser: owner/name header, tab strip, branch pill, file tree, and the README rendered inline. Real semantic palette, Mona Sans for UI and monospace for all code, SHAs, and diffs.',
    pitch:
      'Everything you need to ship a GitHub-grade developer tool front end: exact Primer hex values, the reserved-green Code/Merge button, the iconic contributions heatmap ramp, semantic state pills (open/merged/closed/draft), the diff viewer, and the monospace code browser. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'github clone',
      'github ui kit',
      'github react native template',
      'build a github clone',
      'developer tool app design spec',
    ],
    sector: 'Developer Tools',
    screens: [
      'Repository home with owner/name header',
      'Code browser with path breadcrumb',
      'Pull request with diff viewer',
      'Issues list with state pills',
      'Contributions heatmap on profile',
      'Inline README card',
    ],
  },

  'vercel': {
    tagline: 'Clone Vercel iOS down to the true-black canvas and status-light deployments list',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from the Vercel iOS app, built around the deployments list where one colored dot answers the only question that matters. Real OLED-true black, Geist Sans and Geist Mono, hairline borders instead of shadows, and the Ready-Building-Error traffic light as the only systemic color.',
    pitch:
      'Everything you need to ship a Vercel-grade developer dashboard: exact hex values, the deployments list with status dots and environment tags, the gridless analytics charts, the monospace build-log viewer, and the single-fill triangle logomark. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'vercel clone',
      'vercel ui kit',
      'vercel react native template',
      'build a vercel clone',
      'developer platform app design spec',
    ],
    sector: 'Developer Tools and Deployment',
    screens: [
      'Deployments list with status dots',
      'Project overview with production domain',
      'Build-log viewer in monospace',
      'Web Vitals analytics charts',
      'Environment variables editor',
      'Domains configuration list',
    ],
  },

  'postman': {
    tagline: 'Clone Postman iOS down to the method-color system and the one orange Send button',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from the Postman iOS app, built around the request builder where a colored method pill, a monospace URL, and an orange Send button do all the work. Neutral grey console canvas, a single brand orange reserved for actions, and a JSON viewer with full syntax coloring.',
    pitch:
      'Everything you need to ship a Postman-grade API client: exact hex values, the HTTP-method color system used everywhere a method appears, status-code chips, the syntax-highlighted response viewer, and the key-value request editor. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'postman clone',
      'postman ui kit',
      'postman react native template',
      'build a postman clone',
      'api client app design spec',
    ],
    sector: 'Developer Tools and API Testing',
    screens: [
      'Request builder with method pill and Send',
      'Syntax-highlighted JSON response viewer',
      'Params and Headers key-value editor',
      'Collections tree with method chips',
      'Request history list',
      'Environments and variables editor',
    ],
  },

  'life360': {
    tagline: 'Clone Life360 iOS down to the family map, member identity colors, and SOS button',
    blurb:
      'A pixel-faithful design token catalog reverse-engineered from the Life360 iOS app, built around the map-first home screen where every family member is a fixed-color pin you find by hue, not by reading names. Deep violet night canvas, a dark-styled map that keeps the colored pins salient, and Life360 Purple as the brand spine for Circles and Places.',
    pitch:
      'Everything you need to ship a Life360-grade family locator: exact hex values, the dark-styled map with member pins, the per-member identity color system used everywhere, the draggable member sheet with battery, translucent Place geofences, and the press-and-hold SOS button. Comes with framework-neutral specs plus SwiftUI, Expo, and Jetpack Compose guides.',
    keywords: [
      'life360 clone',
      'life360 ui kit',
      'life360 react native template',
      'build a life360 clone',
      'family location app design spec',
    ],
    sector: 'Family Safety and Location Sharing',
    screens: [
      'Family map with member pins',
      'Draggable member sheet with battery',
      'Circle selector and switcher',
      'Place geofence and arrival alerts',
      'Member detail with location history',
      'Driving report with trip events',
    ],
  },

  'goodreads': {
    tagline: 'Clone Goodreads iOS down to the brown chrome, amber stars, and shelves',
    blurb:
      'A production-grade design spec reverse-engineered from the Goodreads iOS app — the book detail page, shelves, five-star rating, and the community reviews feed. Every brand token, the serif reading rhythm, the shelf model, and each elevation level is captured so an AI agent can rebuild it screen for screen.',
    pitch:
      'Use it as the baseline for any reading, catalog, or social-library app: cover-first grids on warm tan paper, a green Want-to-Read CTA, an amber five-star rating, and a serif review feed. Goodreads brown #382110, tan paper #F4F1EA, rating amber #E9A100, the warm ink-brown #161310 dark canvas, and the 1.6 review line-height are all specified to exact values.',
    keywords: [
      'goodreads clone',
      'goodreads ui kit',
      'goodreads react native template',
      'build a goodreads clone',
      'book tracking app design spec',
    ],
    sector: 'Books & Reading',
    screens: [
      'Book detail with cover, rating and shelf CTA',
      'Rate this book interactive star strip',
      'Community reviews feed with avatars',
      'My Books shelves cover grid',
      'Shelf picker bottom sheet',
      'Reading Challenge progress widget',
    ],
  },

  'kindle': {
    tagline: 'Clone Kindle iOS down to the sepia reader page, Aa panel, and orange progress',
    blurb:
      'A production-grade design spec reverse-engineered from the Amazon Kindle iOS app — the distraction-free reading page, the Aa typography panel, the five reading themes, and the cover-grid library. Every brand token, the justified serif reading rhythm, the vanishing chrome, and each elevation level is captured so an AI agent can rebuild it screen for screen.',
    pitch:
      'Use it as the baseline for any e-reader or long-form reading app: a chrome-free justified serif page, five user-chosen reading themes, an Aa control, and a cover library with progress bars. Sepia page #FBF0D9, warm ink #5F4B32, the single Amazon Orange #FF9900 accent, the #0E0E0E dark chrome canvas, and the 1.72 reading line-height are all specified to exact values.',
    keywords: [
      'kindle clone',
      'kindle ui kit',
      'kindle react native template',
      'build a kindle clone',
      'ebook reader app design spec',
    ],
    sector: 'Books & Reading',
    screens: [
      'Sepia reader page with chapter and progress',
      'Aa typography panel with theme swatches',
      'Library cover grid with progress bars',
      'Continue reading card on Home',
      'Highlight and lookup popover',
      'In-book search with location results',
    ],
  },

  'substack': {
    tagline: 'Clone Substack iOS down to the serif reader, orange Subscribe, and inbox',
    blurb:
      'A production-grade design spec reverse-engineered from the Substack iOS app — the long-form post reader, the orange Subscribe paywall card, the publication header, and the chronological inbox. Every brand token, the editorial serif reading rhythm, the rationed orange, and each elevation level is captured so an AI agent can rebuild it screen for screen.',
    pitch:
      'Use it as the baseline for any newsletter, publishing, or long-form reading app: a clean white serif page, one rationed orange Subscribe CTA, a chronological subscription inbox, and Notes. Substack Orange #FF6719, paper white #FFFFFF, reading ink #1F1F1F, the soft charcoal #121212 dark canvas, and the 1.65 reading line-height are all specified to exact values.',
    keywords: [
      'substack clone',
      'substack ui kit',
      'substack react native template',
      'build a substack clone',
      'newsletter app design spec',
    ],
    sector: 'Publishing & Newsletters',
    screens: [
      'Post reader with serif body and pull-quote',
      'Subscribe paywall card mid-post',
      'Chronological subscription inbox',
      'Publication header with Subscribe',
      'Bottom action bar with like and restack',
      'Notes short-form companion feed',
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
            <BuySpecButton slug={slug} appName={name} className="ga-cta-ghost">
              Get full {name} spec ↓
            </BuySpecButton>
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
          <Link href="/" className="ga-link" prefetch={false}>
            Generate your own ↗
          </Link>
        </nav>
      </main>
    </>
  )
}
