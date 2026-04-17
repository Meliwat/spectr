'use client'

import { useEffect, useRef } from 'react'

type Props = {
  doc: string
  name: string
  href: string
}

export default function HeroPhone({ doc, name, href }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const section = sectionRef.current
      const phone = phoneRef.current
      const copy = copyRef.current
      if (!section || !phone || !copy) return

      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const scrollable = Math.max(1, rect.height - vh)
      const raw = -rect.top / scrollable
      const p = Math.max(0, Math.min(1, raw))

      const rotX = 58 * (1 - p)
      const scale = 0.7 + 0.3 * p
      const ty = (1 - p) * 40
      phone.style.transform =
        `translate3d(0, ${ty}px, 0) rotateX(${rotX}deg) scale(${scale})`

      const copyP = Math.min(1, p * 1.4)
      copy.style.opacity = String(1 - copyP)
      copy.style.transform = `translate3d(0, ${-copyP * 26}px, 0)`
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section ref={sectionRef} className="hero-section">
      <div className="hero-sticky">
        <div className="hero-copy" ref={copyRef}>
          <span className="gal-eyebrow">Gallery</span>
          <h1 className="gal-title">Live app previews</h1>
          <p className="gal-sub">
            Each phone below is a live rendering of a design blueprint Spectr
            produced from a real iOS app.
          </p>
        </div>

        <div className="hero-stage">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-phone-link"
            aria-label={`${name} — view spec`}
          >
            <div className="hero-phone" ref={phoneRef}>
              <div className="hero-phone-frame">
                <div className="hero-phone-glow" aria-hidden="true" />
                <div className="hero-viewport">
                  {doc ? (
                    <iframe
                      className="hero-iframe"
                      srcDoc={doc}
                      sandbox="allow-same-origin"
                      scrolling="no"
                      title={`${name} phone preview`}
                      loading="eager"
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="hero-iframe-skeleton">Preview unavailable</div>
                  )}
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          height: 260vh;
          margin-top: -56px;
        }
        .hero-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 72px 24px 0;
          perspective: 1600px;
          perspective-origin: 50% 30%;
          overflow: hidden;
        }
        .hero-copy {
          text-align: center;
          max-width: 640px;
          will-change: transform, opacity;
        }
        .hero-stage {
          position: relative;
          margin-top: 40px;
          flex: 1 1 auto;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          width: 100%;
          transform-style: preserve-3d;
        }
        .hero-phone-link {
          display: block;
          text-decoration: none;
          color: inherit;
          transform-style: preserve-3d;
        }
        .hero-phone {
          width: clamp(280px, 34vmin, 420px);
          aspect-ratio: 390 / 844;
          will-change: transform;
          transform-origin: 50% 30%;
          transform: translate3d(0, 40px, 0) rotateX(58deg) scale(0.7);
          transform-style: preserve-3d;
        }
        .hero-phone-frame {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 42px;
          padding: 8px;
          background: linear-gradient(160deg,
            rgba(255,255,255,0.14) 0%,
            rgba(255,255,255,0.03) 40%,
            rgba(113,112,255,0.18) 100%);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.6),
            0 18px 48px rgba(0,0,0,0.55),
            0 48px 120px rgba(0,0,0,0.6),
            0 0 96px rgba(113,112,255,0.18),
            inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .hero-phone-glow {
          position: absolute;
          inset: -40px;
          background: radial-gradient(ellipse 70% 60% at 50% 50%,
            rgba(113,112,255,0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }
        .hero-viewport {
          container-type: inline-size;
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 34px;
          overflow: hidden;
          background: #000;
        }
        .hero-iframe {
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
        .hero-iframe-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, #0a0b10 0%, #050506 100%);
          display: flex; align-items: center; justify-content: center;
          color: rgba(160,170,255,0.45);
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-section { height: auto; }
          .hero-sticky { position: relative; height: auto; padding-bottom: 64px; }
          .hero-phone { transform: none !important; }
          .hero-copy { opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </section>
  )
}
