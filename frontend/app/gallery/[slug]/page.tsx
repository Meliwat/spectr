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
}

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return APPS.map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: Params }): Metadata {
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
      url: `${SITE_URL}/gallery`,
    },
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Gallery', item: `${SITE_URL}/gallery` },
      { '@type': 'ListItem', position: 3, name, item: `${SITE_URL}/gallery/${slug}` },
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
          box-shadow: 0 8px 24px rgba(113,112,255,0.35);
        }
        .ga-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 20px; border-radius: 10px;
          color: #e8ebff; font-weight: 500; font-size: 14px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.02);
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
              Generate your own spec →
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
