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

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return APPS.map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  if (!isAppSlug(params.slug)) return {}
  const name = TITLES[params.slug]
  return {
    title: `${name} — Spectr Gallery`,
    description: `A design blueprint Spectr produced from ${name}.`,
    alternates: { canonical: `/gallery/${params.slug}` },
    openGraph: {
      title: `${name} — Spectr Gallery`,
      description: `A design blueprint Spectr produced from ${name}.`,
      url: `/gallery/${params.slug}`,
    },
  }
}

export default async function GalleryAppPage({ params }: { params: Params }) {
  if (!isAppSlug(params.slug)) notFound()
  const slug: AppSlug = params.slug
  const name = TITLES[slug]
  const doc = await fetchPhone(slug)

  return (
    <>
      <style>{`
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
      `}</style>

      <main className="ga-page">
        <SpectrBackground />

        <HeroPhone
          doc={doc ?? ''}
          name={name}
          eyebrow={`Gallery · ${name}`}
          title={name}
          subtitle={`A design blueprint Spectr produced from ${name}. Scroll to look closer.`}
        />

        <nav className="ga-below">
          <Link href="/gallery" className="ga-link" prefetch={false}>
            ← Back to gallery
          </Link>
          <a
            href={specGithubUrl(slug)}
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
