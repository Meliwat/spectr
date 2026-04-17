'use client'

import { useEffect, useRef, RefObject } from 'react'

function PhoneBody({
  doc,
  name,
  phoneRef,
}: {
  doc: string
  name: string
  phoneRef: RefObject<HTMLDivElement>
}) {
  return (
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
  )
}

type Props = {
  doc: string
  name: string
  eyebrow?: string
  title?: string
  subtitle?: string
  href?: string
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 2)

export default function HeroPhone({
  doc,
  name,
  eyebrow = 'Gallery',
  title = 'Live app previews',
  subtitle = 'Each phone below is a live rendering of a design blueprint Spectr produced from a real iOS app.',
  href,
}: Props) {
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
      const e = easeOut(p)

      // Phone is absolutely centered; translate deltas sit on top of -50%/-50%
      const rotX = 44 * (1 - e)
      const scale = 0.78 + 0.22 * e
      const ty = (1 - e) * 28
      phone.style.transform =
        `translate(-50%, calc(-50% + ${ty}px)) rotateX(${rotX}deg) scale(${scale})`

      // Copy fades and lifts during the first ~32% of scroll
      const copyP = Math.min(1, p * 3.1)
      copy.style.opacity = String(1 - copyP)
      copy.style.transform = `translate3d(0, ${-copyP * 30}px, 0)`
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
        <div className="hero-copy-wrap">
          <div className="hero-copy" ref={copyRef}>
            <span className="hero-eyebrow">{eyebrow}</span>
            <h1 className="hero-title">{title}</h1>
            <p className="hero-sub">{subtitle}</p>
          </div>
        </div>

        <div className="hero-stage">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-phone-link"
              aria-label={`${name} — view spec`}
            >
              <PhoneBody doc={doc} name={name} phoneRef={phoneRef} />
            </a>
          ) : (
            <div className="hero-phone-link">
              <PhoneBody doc={doc} name={name} phoneRef={phoneRef} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          height: 220vh;
          margin-top: -56px;
        }
        .hero-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          perspective: 1800px;
          perspective-origin: 50% 50%;
        }
        .hero-copy-wrap {
          position: absolute;
          top: clamp(90px, 14vh, 180px);
          left: 50%;
          transform: translateX(-50%);
          width: min(640px, calc(100% - 48px));
          text-align: center;
          z-index: 2;
          pointer-events: none;
        }
        .hero-copy {
          will-change: transform, opacity;
          pointer-events: auto;
        }
        .hero-eyebrow {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(160,170,255,0.75);
          margin-bottom: 14px;
        }
        .hero-title {
          font-size: clamp(36px, 5.2vw, 64px);
          font-weight: 520;
          line-height: 1.03;
          letter-spacing: -0.032em;
          color: #f7f8f8;
          margin: 0 0 12px;
          text-shadow:
            0 0 60px rgba(113,112,255,0.20),
            0 0 120px rgba(113,112,255,0.08);
        }
        .hero-sub {
          font-size: 15px;
          line-height: 1.55;
          color: rgba(208,214,224,0.72);
          max-width: 560px;
          margin: 0 auto;
        }
        .hero-stage {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          pointer-events: none;
        }
        .hero-phone-link {
          display: block;
          text-decoration: none;
          color: inherit;
          transform-style: preserve-3d;
          pointer-events: auto;
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
        }
        .hero-phone {
          position: absolute;
          top: 50%;
          left: 50%;
          height: min(72vh, 700px);
          aspect-ratio: 390 / 844;
          will-change: transform;
          transform-origin: 50% 50%;
          transform: translate(-50%, calc(-50% + 28px)) rotateX(44deg) scale(0.78);
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
          .hero-sticky { position: relative; height: auto; padding: 72px 24px 48px; }
          .hero-stage { position: relative; inset: auto; height: auto; margin-top: 32px; display: flex; justify-content: center; }
          .hero-phone-link { position: static; width: auto; height: auto; }
          .hero-phone { position: relative; top: auto; left: auto; transform: none !important; }
          .hero-copy { opacity: 1 !important; transform: none !important; }
          .hero-copy-wrap { position: relative; top: auto; transform: none; }
        }
      `}</style>
    </section>
  )
}
