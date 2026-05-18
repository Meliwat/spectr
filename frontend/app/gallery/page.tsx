import type { Metadata } from 'next'
import Link from 'next/link'
import SpectrBackground from '../SpectrBackground'
import { TITLES, fetchPhone, type AppSlug } from './apps'
import {
  CATEGORIES,
  CATEGORY_APPS,
  CATEGORY_LABELS,
  type CategorySlug,
} from './categories'
import { PHONE_CARD_CSS } from './PhoneCard'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Spectr Gallery — Live iOS design blueprints by category',
  description:
    'Browse live iOS design blueprints by category — Social, Messaging, Travel, Music, Video, Food, and more. 200 apps including Airbnb, Instagram, Spotify, TikTok, Uber, ChatGPT, Notion, Netflix.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    url: `${SITE_URL}/gallery`,
    title: 'Spectr Gallery — Live iOS design blueprints by category',
    description:
      'Browse live iOS design blueprints by category — Social, Messaging, Travel, Music, Video, Food, and more.',
  },
}

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Spectr Gallery',
  description:
    'Live iOS design blueprints grouped by category.',
  url: `${SITE_URL}/gallery`,
  creator: {
    '@type': 'Organization',
    name: 'Spectr',
    url: SITE_URL,
  },
}

type StackEntry = { slug: AppSlug; name: string; doc: string | null }

async function buildStack(cat: CategorySlug): Promise<StackEntry[]> {
  const apps = CATEGORY_APPS[cat].slice(0, 3)
  return Promise.all(
    apps.map(async (slug) => ({
      slug,
      name: TITLES[slug],
      doc: await fetchPhone(slug),
    })),
  )
}

export default async function HomePage() {
  const stacks = await Promise.all(
    CATEGORIES.map(async (cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      total: CATEGORY_APPS[cat].length,
      previews: await buildStack(cat),
    })),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        ${PHONE_CARD_CSS}

        .cat-page {
          position: relative;
          min-height: calc(100dvh - 72px);
          overflow-x: clip;
          background: radial-gradient(ellipse 180% 100% at 50% -20%,
            #0d0e18 0%, #07080f 40%, #010102 100%);
          padding: 56px 24px 120px;
        }
        .cat-inner {
          position: relative;
          z-index: 3;
          max-width: 1180px;
          margin: 0 auto;
        }
        .cat-head {
          text-align: center;
          margin-bottom: 72px;
        }
        .cat-eyebrow {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(160,170,255,0.75);
          margin-bottom: 14px;
        }
        .cat-title {
          font-size: clamp(32px, 4.2vw, 52px);
          font-weight: 520;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: #f7f8f8;
          margin: 0 0 10px;
          text-shadow:
            0 0 60px rgba(113,112,255,0.18),
            0 0 120px rgba(113,112,255,0.06);
        }
        .cat-sub {
          font-size: 15px;
          line-height: 1.55;
          color: rgba(208,214,224,0.72);
          max-width: 560px;
          margin: 0 auto;
        }

        .cat-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 96px 36px;
          justify-items: center;
        }
        @media (min-width: 640px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .cat-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .cat-cell {
          width: 100%;
          max-width: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          text-decoration: none;
          color: inherit;
        }
        .cat-stack {
          position: relative;
          width: 100%;
          aspect-ratio: 390 / 844;
          isolation: isolate;
        }
        .cat-stack .phone-frame {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          transform-origin: center center;
          transition:
            transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
            opacity 0.45s ease,
            box-shadow 0.45s ease;
          will-change: transform;
        }

        /* 3-phone stack */
        .cat-stack[data-depth="3"] .phone-frame[data-pos="back"] {
          z-index: 1;
          opacity: 0.5;
          transform: translateY(24px) scale(0.92) rotate(-2deg);
        }
        .cat-stack[data-depth="3"] .phone-frame[data-pos="middle"] {
          z-index: 2;
          opacity: 0.75;
          transform: translateY(12px) scale(0.96) rotate(0deg);
        }
        .cat-stack[data-depth="3"] .phone-frame[data-pos="front"] {
          z-index: 3;
          opacity: 1;
          transform: rotate(2deg);
        }

        /* 2-phone stack */
        .cat-stack[data-depth="2"] .phone-frame[data-pos="back"] {
          z-index: 1;
          opacity: 0.6;
          transform: translateY(16px) scale(0.94) rotate(-2deg);
        }
        .cat-stack[data-depth="2"] .phone-frame[data-pos="front"] {
          z-index: 3;
          opacity: 1;
          transform: rotate(2deg);
        }

        /* Hover nudge */
        .cat-cell:hover .cat-stack[data-depth="3"] .phone-frame[data-pos="back"] {
          transform: translateY(32px) translateX(-14px) scale(0.92) rotate(-5deg);
        }
        .cat-cell:hover .cat-stack[data-depth="3"] .phone-frame[data-pos="middle"] {
          transform: translateY(16px) translateX(0) scale(0.96) rotate(0deg);
        }
        .cat-cell:hover .cat-stack[data-depth="3"] .phone-frame[data-pos="front"] {
          transform: translateY(-6px) translateX(10px) rotate(4deg);
        }
        .cat-cell:hover .cat-stack[data-depth="2"] .phone-frame[data-pos="back"] {
          transform: translateY(22px) translateX(-14px) scale(0.94) rotate(-5deg);
        }
        .cat-cell:hover .cat-stack[data-depth="2"] .phone-frame[data-pos="front"] {
          transform: translateY(-6px) translateX(10px) rotate(4deg);
        }

        .cat-caption {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 10px;
        }
        .cat-name {
          font-size: 19px;
          font-weight: 620;
          color: #f3f4fb;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .cat-count {
          font-size: 11.5px;
          color: rgba(160,170,255,0.65);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-feature-settings: "tnum";
        }
      ` }} />

      <main className="cat-page">
        <SpectrBackground />

        <div className="cat-inner">
          <div className="cat-head">
            <span className="cat-eyebrow">Gallery</span>
            <h1 className="cat-title">Browse by category</h1>
            <p className="cat-sub">
              200 design blueprints Spectr produced from real iOS apps —
              grouped by category. Tap a stack to open.
            </p>
          </div>

          <div className="cat-grid">
            {stacks.map(({ cat, label, total, previews }) => {
              const depth = Math.min(total, 3)
              const positions =
                depth === 3 ? (['back', 'middle', 'front'] as const) : (['back', 'front'] as const)
              return (
                <Link
                  key={cat}
                  href={`/gallery/${cat}`}
                  className="cat-cell"
                  prefetch={false}
                >
                  <div className="cat-stack" data-depth={depth}>
                    {positions.map((pos, i) => {
                      const entry = previews[i]
                      if (!entry) return null
                      return (
                        <div
                          key={entry.slug}
                          data-pos={pos}
                          className="phone-frame"
                        >
                          <div className="phone-glow" aria-hidden="true" />
                          <div className="phone-viewport">
                            {entry.doc ? (
                              <iframe
                                className="phone-iframe"
                                srcDoc={entry.doc}
                                sandbox="allow-same-origin"
                                scrolling="no"
                                title={`${entry.name} preview`}
                                loading="lazy"
                                aria-hidden="true"
                              />
                            ) : (
                              <div className="phone-skeleton">Preview unavailable</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="cat-caption">
                    <p className="cat-name">{label}</p>
                    <span className="cat-count">· {total}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
