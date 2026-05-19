import Link from 'next/link'
import SpectrBackground from '../SpectrBackground'
import { TITLES, fetchPhone, type AppSlug } from './apps'
import { CATEGORY_APPS, CATEGORY_LABELS, type CategorySlug } from './categories'
import PhoneCard, { PHONE_CARD_CSS } from './PhoneCard'
import BuyCategoryButton from './BuyCategoryButton'

type Props = { category: CategorySlug }

export default async function CategoryView({ category }: Props) {
  const label = CATEGORY_LABELS[category]
  const apps = CATEGORY_APPS[category]
  const previews = await Promise.all(
    apps.map(async (slug: AppSlug) => ({
      slug,
      name: TITLES[slug],
      doc: await fetchPhone(slug),
    })),
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        ${PHONE_CARD_CSS}

        .cgv-page {
          position: relative;
          min-height: calc(100dvh - 72px);
          overflow-x: clip;
          background: radial-gradient(ellipse 180% 100% at 50% -20%,
            #0d0e18 0%, #07080f 40%, #010102 100%);
          padding: 56px 24px 96px;
        }
        .cgv-inner {
          position: relative;
          z-index: 3;
          max-width: 1280px;
          margin: 0 auto;
        }
        .cgv-topback {
          margin-bottom: 24px;
        }
        .cgv-topback a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: rgba(200,210,240,0.7);
          text-decoration: none;
          transition: color 0.18s ease;
        }
        .cgv-topback a:hover { color: #fff; }
        .cgv-topback .arr { font-size: 14px; line-height: 1; }

        .cgv-head {
          text-align: center;
          margin-bottom: 56px;
        }
        .cgv-eyebrow {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(160,170,255,0.75);
          margin-bottom: 14px;
        }
        .cgv-title {
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
        .cgv-sub {
          font-size: 15px;
          line-height: 1.55;
          color: rgba(208,214,224,0.72);
          max-width: 560px;
          margin: 0 auto;
        }
        .cgv-cta {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 22px;
          padding: 12px 22px; border-radius: 10px;
          background: linear-gradient(135deg, #7a6cff 0%, #a88bff 100%);
          color: #0a0b14; font-weight: 600; font-size: 14px;
          border: 0; cursor: pointer; font-family: inherit;
          box-shadow: 0 8px 24px rgba(113,112,255,0.35);
          transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .cgv-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(113,112,255,0.42); }
        .cgv-cta:disabled { opacity: 0.6; cursor: default; }

        .cgv-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px 32px;
          justify-items: center;
        }
        @media (min-width: 640px) {
          .cgv-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1040px) {
          .cgv-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1280px) {
          .cgv-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .cgv-card {
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
        .cgv-card:hover { transform: translateY(-6px); }
        .cgv-card:hover .phone-frame {
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.6),
            0 20px 48px rgba(0,0,0,0.5),
            0 40px 100px rgba(0,0,0,0.6),
            0 0 72px rgba(113,112,255,0.22),
            inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .cgv-caption {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          text-align: center;
        }
        .cgv-name {
          font-size: 14px;
          font-weight: 560;
          letter-spacing: -0.005em;
          color: #e8ebff;
          margin: 0;
        }
        .cgv-meta {
          font-size: 10.5px;
          color: rgba(160,170,255,0.55);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
      `}} />

      <main className="cgv-page">
        <SpectrBackground />

        <div className="cgv-inner">
          <div className="cgv-topback">
            <Link href="/" prefetch={false}>
              <span className="arr">←</span> Back to categories
            </Link>
          </div>

          <div className="cgv-head">
            <span className="cgv-eyebrow">Category</span>
            <h1 className="cgv-title">{label}</h1>
            <p className="cgv-sub">
              {apps.length} design {apps.length === 1 ? 'blueprint' : 'blueprints'} in{' '}
              {label.toLowerCase()}. Tap a phone to open.
            </p>
            <div>
              <BuyCategoryButton
                category={category}
                categoryLabel={label}
                count={apps.length}
                className="cgv-cta"
              >
                Get all {label} app specs ({apps.length}) ↓
              </BuyCategoryButton>
            </div>
          </div>

          <div className="cgv-grid">
            {previews.map(({ slug, name, doc }) => (
              <Link
                key={slug}
                href={`/gallery/${slug}`}
                className="cgv-card"
                prefetch={false}
              >
                <PhoneCard doc={doc} name={name} />
                <div className="cgv-caption">
                  <p className="cgv-name">{name}</p>
                  <span className="cgv-meta">Open →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
