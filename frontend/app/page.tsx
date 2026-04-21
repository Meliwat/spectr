import type { Metadata } from 'next'
import Link from 'next/link'
import SpectrBackground from './SpectrBackground'
import { APPS, TITLES, fetchPhone } from './gallery/apps'

const SITE_URL = (process.env.SITE_URL || 'https://www.spectr.to').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Spectr — Live iOS design blueprints',
  description:
    'Live phone previews of UI blueprints generated from real iOS apps — 30 apps including Airbnb, Instagram, Spotify, TikTok, Uber, ChatGPT, Notion, Netflix, and more.',
  alternates: { canonical: '/' },
  openGraph: {
    url: SITE_URL,
    title: 'Spectr — Live iOS design blueprints',
    description:
      'Live phone previews of UI blueprints generated from real iOS apps.',
  },
}

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Spectr Gallery',
  description:
    'Live phone previews of UI blueprints generated from real iOS apps.',
  url: SITE_URL,
  creator: {
    '@type': 'Organization',
    name: 'Spectr',
    url: SITE_URL,
  },
}

export default async function HomePage() {
  const previews = await Promise.all(
    APPS.map(async (slug) => ({
      slug,
      name: TITLES[slug],
      doc: await fetchPhone(slug),
    })),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .gal-page {
          position: relative;
          min-height: calc(100dvh - 72px);
          overflow-x: clip;
          background: radial-gradient(ellipse 180% 100% at 50% -20%,
            #0d0e18 0%, #07080f 40%, #010102 100%);
          padding: 56px 24px 96px;
        }
        .gal-inner {
          position: relative;
          z-index: 3;
          max-width: 1280px;
          margin: 0 auto;
        }
        .gal-head {
          text-align: center;
          margin-bottom: 56px;
        }
        .gal-eyebrow {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(160,170,255,0.75);
          margin-bottom: 14px;
        }
        .gal-title {
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
        .gal-sub {
          font-size: 15px;
          line-height: 1.55;
          color: rgba(208,214,224,0.72);
          max-width: 560px;
          margin: 0 auto;
        }

        .gal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px 32px;
          justify-items: center;
        }
        @media (min-width: 640px) {
          .gal-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1040px) {
          .gal-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1280px) {
          .gal-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .gal-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          color: inherit;
          width: 100%;
          max-width: 300px;
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .gal-card:hover {
          transform: translateY(-6px);
        }

        .gal-phone-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 390 / 844;
          border-radius: 38px;
          padding: 6px;
          background: linear-gradient(160deg,
            rgba(255,255,255,0.10) 0%,
            rgba(255,255,255,0.02) 40%,
            rgba(113,112,255,0.12) 100%);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.55),
            0 14px 36px rgba(0,0,0,0.45),
            0 32px 80px rgba(0,0,0,0.55),
            0 0 56px rgba(113,112,255,0.08),
            inset 0 1px 0 rgba(255,255,255,0.09);
          transition: box-shadow 0.35s ease;
        }
        .gal-card:hover .gal-phone-frame {
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.6),
            0 20px 48px rgba(0,0,0,0.5),
            0 40px 100px rgba(0,0,0,0.6),
            0 0 72px rgba(113,112,255,0.22),
            inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .gal-phone-glow {
          position: absolute;
          inset: -22px;
          background: radial-gradient(ellipse 70% 60% at 50% 50%,
            rgba(113,112,255,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        .gal-viewport {
          container-type: inline-size;
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 32px;
          overflow: hidden;
          background: #000;
        }
        .gal-iframe {
          position: absolute;
          top: 0; left: 0;
          width: 390px;
          height: 844px;
          border: 0;
          transform: scale(calc(100cqw / 390px));
          transform-origin: top left;
          pointer-events: none;
          background: #000;
          color-scheme: dark;
        }
        .gal-iframe-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, #0a0b10 0%, #050506 100%);
          display: flex; align-items: center; justify-content: center;
          color: rgba(160,170,255,0.45);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .gal-caption {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          text-align: center;
        }
        .gal-name {
          font-size: 14px;
          font-weight: 560;
          letter-spacing: -0.005em;
          color: #e8ebff;
          margin: 0;
        }
        .gal-meta {
          font-size: 10.5px;
          color: rgba(160,170,255,0.55);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
      ` }} />

      <main className="gal-page">
        <SpectrBackground />

        <div className="gal-inner">
          <div className="gal-head">
            <span className="gal-eyebrow">Gallery</span>
            <h1 className="gal-title">Live app previews</h1>
            <p className="gal-sub">
              Each phone below is a live rendering of a design blueprint Spectr
              produced from a real iOS app. Tap one to open it.
            </p>
          </div>

          <div className="gal-grid">
            {previews.map(({ slug, name, doc }) => (
              <Link
                key={slug}
                href={`/gallery/${slug}`}
                className="gal-card"
                prefetch={false}
              >
                <div className="gal-phone-frame">
                  <div className="gal-phone-glow" aria-hidden="true" />
                  <div className="gal-viewport">
                    {doc ? (
                      <iframe
                        className="gal-iframe"
                        srcDoc={doc}
                        sandbox="allow-same-origin"
                        scrolling="no"
                        title={`${name} phone preview`}
                        loading="lazy"
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="gal-iframe-skeleton">Preview unavailable</div>
                    )}
                  </div>
                </div>
                <div className="gal-caption">
                  <p className="gal-name">{name}</p>
                  <span className="gal-meta">Open →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
