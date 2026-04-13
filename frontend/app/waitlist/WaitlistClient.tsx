'use client'

import { useEffect, useRef, useState } from 'react'

// ── PARTICLE LAYERS ──────────────────────────────────────────────────────────
// Tier A: dust — tiny, fast, white, many
// [left%, size(px), dur(s), negDelay(s), opacity]
const DUST: [number, number, number, number, number][] = [
  [3,1,9,0,0.18],[11,1,7,3,0.22],[19,1,11,1,0.15],[27,1,8,5,0.20],
  [35,1,10,2,0.18],[43,1,7,7,0.24],[51,1,9,4,0.16],[59,1,11,1,0.21],
  [67,1,8,6,0.18],[75,1,10,3,0.20],[83,1,7,8,0.15],[91,1,9,0,0.22],
  [7,1,10,2,0.17],[23,1,8,9,0.19],[39,1,11,4,0.16],[55,1,7,6,0.23],
  [71,1,9,1,0.18],[87,1,10,7,0.21],[14,1,8,3,0.20],[46,1,7,5,0.16],
]

// Tier B: orbs — medium, violet/indigo mix
// [left%, size(px), dur(s), negDelay(s), r, g, b, opacity]
const ORBS: [number, number, number, number, number, number, number, number][] = [
  [8,  2.5, 14, 0,  113,112,255, 0.55],
  [22, 3,   11, 5,  94, 106,210, 0.50],
  [36, 2.5, 16, 2,  113,112,255, 0.48],
  [50, 3,   13, 8,  130,143,255, 0.55],
  [64, 2.5, 12, 3,  94, 106,210, 0.45],
  [78, 3,   15, 7,  113,112,255, 0.58],
  [92, 2.5, 10, 1,  130,143,255, 0.50],
  [15, 3,   17, 4,  113,112,255, 0.45],
  [45, 2.5, 12, 9,  94, 106,210, 0.52],
  [72, 3,   14, 6,  113,112,255, 0.48],
  [30, 2.5, 13, 2,  130,143,255, 0.42],
  [85, 3,   11, 5,  113,112,255, 0.55],
]

// Tier C: halos — large, very blurred, slow, accent color
// [left%, size(px), dur(s), negDelay(s), opacity]
const HALOS: [number, number, number, number, number][] = [
  [18, 8, 22, 0,  0.18],
  [42, 6, 28, 9,  0.14],
  [63, 9, 19, 4,  0.16],
  [82, 7, 25, 14, 0.12],
]

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function WaitlistClient() {
  const [email, setEmail]         = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [focused, setFocused]     = useState(false)
  const [mounted, setMounted]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || formState === 'loading') return
    setFormState('loading')
    try {
      const res = await fetch('https://formspree.io/f/PLACEHOLDER', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      })
      setFormState(res.ok ? 'success' : 'error')
    } catch {
      setFormState('error')
    }
  }

  return (
    <>
      <style>{`
        :root {
          --wl-spring:    cubic-bezier(0.16, 1, 0.3, 1);
          --wl-snap:      cubic-bezier(0.25, 1, 0.5, 1);
          --wl-ease-out:  cubic-bezier(0.0, 0, 0.2, 1);
        }

        /* ════════════════════════════════════════════════════
           BACKGROUND SYSTEM — 7 LAYERS
        ════════════════════════════════════════════════════ */

        .wl-page {
          min-height: calc(100dvh - 72px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px 80px;
          position: relative;
          overflow: hidden;
          /* L1: base */
          background: radial-gradient(ellipse 180% 100% at 50% -20%,
            #0d0e18 0%,
            #07080f 40%,
            #010102 100%
          );
        }

        /* L2: Aurora mesh — animated */
        .wl-aurora {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%,
              rgba(94,106,210,0.14) 0%,
              transparent 60%),
            radial-gradient(ellipse 70% 50% at 80% 70%,
              rgba(113,112,255,0.10) 0%,
              transparent 60%),
            radial-gradient(ellipse 60% 80% at 50% 0%,
              rgba(130,143,255,0.18) 0%,
              transparent 55%);
          animation: wl-aurora-breathe 12s ease-in-out infinite alternate;
        }
        @keyframes wl-aurora-breathe {
          0%   { opacity: 0.7; transform: scale(1)    rotate(0deg); }
          33%  { opacity: 1.0; transform: scale(1.04) rotate(0.5deg); }
          66%  { opacity: 0.8; transform: scale(0.98) rotate(-0.3deg); }
          100% { opacity: 1.0; transform: scale(1.02) rotate(0.2deg); }
        }

        /* L3: vertical grid (12-col, fades top→70%) */
        .wl-grid {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            repeating-linear-gradient(
              to right,
              transparent 0,
              transparent calc(100% / 12 - 1px),
              rgba(255,255,255,0.016) calc(100% / 12 - 1px),
              rgba(255,255,255,0.016) calc(100% / 12)
            );
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 70%);
        }

        /* L4: horizontal scan bands (very subtle depth banding) */
        .wl-bands {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            repeating-linear-gradient(
              180deg,
              transparent 0px,
              transparent 3px,
              rgba(255,255,255,0.004) 3px,
              rgba(255,255,255,0.004) 4px
            );
          opacity: 0.6;
        }

        /* L5: noise film grain */
        .wl-noise {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 96px 96px;
        }

        /* L6: radial edge vignette */
        .wl-vignette {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse 110% 90% at 50% 50%,
            transparent 45%,
            rgba(1,1,2,0.55) 100%
          );
        }

        /* L7: bottom floor gradient (anchors content) */
        .wl-floor {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 280px; pointer-events: none; z-index: 0;
          background: linear-gradient(0deg,
            rgba(1,1,2,0.8) 0%,
            transparent 100%
          );
        }

        /* ════════════════════════════════════════════════════
           PARTICLE SYSTEM — 3 TIERS
        ════════════════════════════════════════════════════ */

        .wl-particles { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }

        @keyframes wl-rise-dust {
          0%   { transform: translateY(0vh) translateX(0px);   opacity: var(--op); }
          45%  { transform: translateY(-45vh) translateX(3px); opacity: calc(var(--op) * 0.7); }
          100% { transform: translateY(-105vh) translateX(-2px); opacity: 0; }
        }
        @keyframes wl-rise-orb {
          0%   { transform: translateY(0vh) scale(1);    opacity: var(--op); }
          60%  { transform: translateY(-65vh) scale(0.8); opacity: calc(var(--op) * 0.5); }
          100% { transform: translateY(-108vh) scale(0.4); opacity: 0; }
        }
        @keyframes wl-rise-halo {
          0%   { transform: translateY(0vh) scale(1);    opacity: var(--op); }
          50%  { transform: translateY(-50vh) scale(1.2); opacity: calc(var(--op) * 0.6); }
          100% { transform: translateY(-105vh) scale(0.6); opacity: 0; }
        }

        /* ════════════════════════════════════════════════════
           EYEBROW + LIVE DOT
        ════════════════════════════════════════════════════ */

        .wl-eyebrows {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 10px; margin-bottom: 40px;
          opacity: 0;
          animation: ghost-emerge 0.8s var(--wl-spring) 80ms forwards;
        }

        .wl-live-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 12px 5px 10px;
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.18);
          border-radius: 99px;
          font-size: 11px; font-weight: 500;
          color: rgba(16,185,129,0.9);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .wl-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px rgba(16,185,129,0.8);
          animation: wl-live-pulse 2s ease-in-out infinite;
        }
        @keyframes wl-live-pulse {
          0%, 100% { opacity: 1;   transform: scale(1); box-shadow: 0 0 6px rgba(16,185,129,0.8); }
          50%       { opacity: 0.6; transform: scale(0.8); box-shadow: 0 0 3px rgba(16,185,129,0.4); }
        }

        /* ════════════════════════════════════════════════════
           HEADLINE — CHROMATIC ABERRATION + TWO-TONE
        ════════════════════════════════════════════════════ */

        .wl-h1 {
          font-size: clamp(44px, 7vw, 80px);
          font-weight: 510;
          line-height: 1.0;
          letter-spacing: -0.04em;
          margin-bottom: 28px;
          opacity: 0;
          animation: ghost-emerge 0.9s var(--wl-spring) 220ms forwards;
        }

        /* Line 1: full white + chromatic aberration text shadow */
        .wl-h1-line1 {
          display: block;
          color: #f7f8f8;
          text-shadow:
            -1px  0px 0  rgba(255,50,120,0.11),
             1px  0px 0  rgba(0,210,255,0.11),
             0    0  80px rgba(113,112,255,0.20),
             0    0 120px rgba(113,112,255,0.08);
        }

        /* Line 2: gradient fade + subtle blue cast */
        .wl-h1-line2 {
          display: block;
          background: linear-gradient(180deg,
            rgba(200,205,255,0.68) 0%,
            rgba(180,188,255,0.38) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(113,112,255,0.12));
        }

        /* Animated scan line that sweeps through h1 on load */
        .wl-h1-wrap {
          position: relative;
          display: inline-block;
          width: 100%;
        }
        .wl-h1-scan {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(113,112,255,0.35) 20%,
            rgba(255,255,255,0.55) 50%,
            rgba(113,112,255,0.35) 80%,
            transparent 100%
          );
          opacity: 0;
          animation: wl-scan-sweep 1.2s var(--wl-ease-out) 400ms forwards;
          pointer-events: none;
        }
        @keyframes wl-scan-sweep {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }

        /* ════════════════════════════════════════════════════
           DIVIDER + SUBHEADLINE
        ════════════════════════════════════════════════════ */

        .wl-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(113,112,255,0.4),
            rgba(255,255,255,0.15),
            rgba(113,112,255,0.4),
            transparent
          );
          margin: 0 auto 28px;
          opacity: 0;
          animation: ghost-emerge 0.8s var(--wl-spring) 340ms forwards;
        }

        .wl-sub {
          font-size: 17px;
          color: var(--text-2);
          line-height: 1.65;
          letter-spacing: -0.01em;
          font-weight: 400;
          margin: 0 auto 44px;
          opacity: 0;
          animation: ghost-emerge 0.8s var(--wl-spring) 420ms forwards;
        }
        .wl-sub strong {
          color: rgba(200,205,255,0.8);
          font-weight: 500;
        }

        /* ════════════════════════════════════════════════════
           FORM CARD — GLASS MORPHISM WITH INNER REFRACTION
        ════════════════════════════════════════════════════ */

        .wl-card-wrap {
          position: relative;
          opacity: 0;
          animation: ghost-emerge 0.9s var(--wl-spring) 560ms forwards;
        }

        /* Ambient bloom behind card */
        .wl-card-bloom {
          position: absolute;
          inset: -24px;
          background: radial-gradient(ellipse 80% 60% at 50% 50%,
            rgba(113,112,255,0.08) 0%,
            transparent 70%
          );
          pointer-events: none;
          transition: opacity 0.4s ease;
          opacity: 0;
        }
        .wl-card-wrap.focused .wl-card-bloom { opacity: 1; }

        .wl-card {
          position: relative;
          width: 100%;
          padding: 26px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(10,11,14,0.75);
          backdrop-filter: blur(32px) saturate(1.4);
          -webkit-backdrop-filter: blur(32px) saturate(1.4);
          box-shadow:
            0 0   0  1px rgba(0,0,0,0.5),
            0 8px 24px rgba(0,0,0,0.4),
            0 32px 80px rgba(0,0,0,0.55),
            inset 0  1px 0  rgba(255,255,255,0.06),
            inset 0 -1px 0  rgba(0,0,0,0.3);
          transition:
            border-color 0.35s ease,
            box-shadow 0.35s ease;
          overflow: hidden;
        }
        .wl-card-wrap.focused .wl-card {
          border-color: rgba(113,112,255,0.20);
          box-shadow:
            0 0   0  1px rgba(0,0,0,0.5),
            0 8px 24px rgba(0,0,0,0.4),
            0 32px 80px rgba(0,0,0,0.55),
            0 0  80px rgba(113,112,255,0.10),
            inset 0  1px 0  rgba(113,112,255,0.10),
            inset 0 -1px 0  rgba(0,0,0,0.3);
        }

        /* Top edge glow strip */
        .wl-card::before {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(113,112,255,0.5),
            rgba(200,210,255,0.6),
            rgba(113,112,255,0.5),
            transparent
          );
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .wl-card-wrap.focused .wl-card::before { opacity: 1; }

        /* Inner refraction highlight — top corner light leak */
        .wl-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 60%; height: 40%;
          background: radial-gradient(ellipse 120% 120% at 0% 0%,
            rgba(255,255,255,0.025) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        /* Animated scan line on card focus */
        .wl-card-scan {
          position: absolute;
          top: -2px; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(113,112,255,0.6) 30%,
            rgba(200,210,255,0.8) 50%,
            rgba(113,112,255,0.6) 70%,
            transparent 100%
          );
          opacity: 0;
          pointer-events: none;
        }
        .wl-card-wrap.focused .wl-card-scan {
          animation: wl-card-scan-drop 0.7s var(--wl-ease-out) forwards;
        }
        @keyframes wl-card-scan-drop {
          0%   { top: -2px; opacity: 0; }
          10%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        /* ════════════════════════════════════════════════════
           INPUT FIELD
        ════════════════════════════════════════════════════ */

        .wl-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 11px;
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition:
            background 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            transform 0.2s var(--wl-snap);
          margin-bottom: 10px;
          /* Inner shadow for depth */
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .wl-input::placeholder { color: var(--subdued); }
        .wl-input:focus {
          background: rgba(113,112,255,0.04);
          border-color: rgba(113,112,255,0.40);
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.15),
            0 0 0 1px rgba(113,112,255,0.40),
            0 0 0 4px rgba(113,112,255,0.10),
            0 0 32px rgba(113,112,255,0.10);
          transform: translateY(-1px) scale(1.004);
        }

        /* ════════════════════════════════════════════════════
           BUTTON — SPRING PRESS + MULTI-LAYER GLOW
        ════════════════════════════════════════════════════ */

        .wl-btn {
          position: relative; overflow: hidden;
          width: 100%; padding: 14px;
          background: linear-gradient(180deg,
            rgba(130,143,255,1.0) 0%,
            rgba(94,106,210,1.0) 100%
          );
          border: 1px solid rgba(160,170,255,0.25);
          border-radius: 11px;
          color: #fff;
          font-size: 15px; font-weight: 520; font-family: inherit;
          letter-spacing: 0.005em;
          cursor: pointer;
          box-shadow:
            0   1px  0  rgba(255,255,255,0.15) inset,
            0  -1px  0  rgba(0,0,0,0.20) inset,
            0   0  40px rgba(113,112,255,0.30),
            0   8px 28px rgba(94,106,210,0.30);
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.15s var(--wl-snap),
            border-color 0.2s ease;
        }
        .wl-btn:hover:not(:disabled) {
          background: linear-gradient(180deg,
            rgba(155,165,255,1.0) 0%,
            rgba(113,125,230,1.0) 100%
          );
          box-shadow:
            0   1px  0  rgba(255,255,255,0.18) inset,
            0  -1px  0  rgba(0,0,0,0.20) inset,
            0   0  60px rgba(113,112,255,0.50),
            0  12px 36px rgba(94,106,210,0.45);
          transform: translateY(-1.5px);
          border-color: rgba(180,190,255,0.30);
        }
        .wl-btn:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.978);
          box-shadow:
            0   0px  0  rgba(255,255,255,0.12) inset,
            0  -1px  0  rgba(0,0,0,0.25) inset,
            0   0  20px rgba(113,112,255,0.20),
            0   4px 12px rgba(94,106,210,0.25);
        }
        .wl-btn:disabled { opacity: 0.50; cursor: not-allowed; }

        /* Shine sweep on hover */
        .wl-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -120%; width: 55%; height: 100%;
          background: linear-gradient(105deg,
            transparent 0%,
            rgba(255,255,255,0.08) 40%,
            rgba(255,255,255,0.15) 50%,
            rgba(255,255,255,0.08) 60%,
            transparent 100%
          );
          transform: skewX(-15deg);
          transition: none;
          pointer-events: none;
        }
        .wl-btn:hover:not(:disabled)::before {
          animation: wl-shine 0.55s ease forwards;
        }
        @keyframes wl-shine {
          from { left: -120%; }
          to   { left: 140%;  }
        }

        /* Loading state — pulsing dots via text */
        .wl-btn-dots::after {
          content: '';
          animation: wl-dots 1s steps(3, end) infinite;
        }
        @keyframes wl-dots {
          0%   { content: '.'; }
          33%  { content: '..'; }
          66%  { content: '...'; }
          100% { content: ''; }
        }

        .wl-founding {
          font-size: 12px;
          color: var(--subdued);
          margin-top: 16px;
          letter-spacing: 0.01em;
        }
        .wl-founding span {
          color: rgba(113,112,255,0.7);
        }

        /* ════════════════════════════════════════════════════
           SUCCESS STATE
        ════════════════════════════════════════════════════ */

        .wl-success-wrap {
          padding: 8px 0 4px;
          animation: ghost-emerge 0.5s var(--wl-spring) forwards;
        }
        .wl-success-icon {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(16,185,129,0.10);
          border: 1px solid rgba(16,185,129,0.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px;
          font-size: 18px;
          animation: wl-success-pop 0.4s var(--wl-spring) 0.1s both;
        }
        @keyframes wl-success-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .wl-success-text {
          font-size: 16px;
          color: var(--text-2);
          line-height: 1.6;
        }
        .wl-success-text strong {
          display: block;
          color: var(--text);
          font-size: 17px;
          margin-bottom: 4px;
        }

        .wl-error {
          font-size: 12px;
          color: var(--error);
          margin-top: 10px;
          opacity: 0;
          animation: ghost-emerge 0.4s var(--wl-spring) forwards;
        }

        /* ════════════════════════════════════════════════════
           SOCIAL PROOF STRIP — with micro-pulse on dots
        ════════════════════════════════════════════════════ */

        .wl-strip {
          display: flex; align-items: center; justify-content: center;
          flex-wrap: wrap; gap: 16px;
          margin-top: 32px;
          opacity: 0;
          animation: ghost-emerge 0.8s var(--wl-spring) 860ms forwards;
        }
        .wl-strip-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px;
          color: var(--subdued);
          letter-spacing: 0.02em;
        }
        .wl-strip-icon {
          width: 14px; height: 14px; opacity: 0.35;
          flex-shrink: 0;
        }
        .wl-strip-sep {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }
      `}</style>

      <main className="wl-page">
        {/* Background layers */}
        <div className="wl-aurora"   aria-hidden="true" />
        <div className="wl-grid"     aria-hidden="true" />
        <div className="wl-bands"    aria-hidden="true" />
        <div className="wl-noise"    aria-hidden="true" />
        <div className="wl-vignette" aria-hidden="true" />
        <div className="wl-floor"    aria-hidden="true" />

        {/* Particle system — 3 tiers */}
        <div className="wl-particles" aria-hidden="true">
          {/* Tier A: dust */}
          {DUST.map(([left, size, dur, negDelay, op], i) => (
            <div key={`d${i}`} style={{
              position: 'absolute', bottom: '-4px',
              left: `${left}%`,
              width: `${size}px`, height: `${size}px`,
              borderRadius: '50%',
              background: `rgba(255,255,255,${op})`,
              animation: `wl-rise-dust ${dur}s linear -${negDelay}s infinite`,
              ['--op' as string]: op,
            }} />
          ))}
          {/* Tier B: orbs */}
          {ORBS.map(([left, size, dur, negDelay, r, g, b, op], i) => (
            <div key={`o${i}`} style={{
              position: 'absolute', bottom: '-6px',
              left: `${left}%`,
              width: `${size}px`, height: `${size}px`,
              borderRadius: '50%',
              background: `rgba(${r},${g},${b},${op})`,
              filter: 'blur(0.6px)',
              animation: `wl-rise-orb ${dur}s linear -${negDelay}s infinite`,
              ['--op' as string]: op,
            }} />
          ))}
          {/* Tier C: halos */}
          {HALOS.map(([left, size, dur, negDelay, op], i) => (
            <div key={`h${i}`} style={{
              position: 'absolute', bottom: '-16px',
              left: `${left}%`,
              width: `${size}px`, height: `${size}px`,
              borderRadius: '50%',
              background: `rgba(113,112,255,${op})`,
              filter: 'blur(3px)',
              animation: `wl-rise-halo ${dur}s linear -${negDelay}s infinite`,
              ['--op' as string]: op,
            }} />
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{
          position: 'relative', zIndex: 2,
          width: 'min(580px, calc(100vw - 48px))',
          textAlign: 'center',
        }}>
          {/* Eyebrow row */}
          <div className="wl-eyebrows">
            <span className="wl-live-badge">
              <span className="wl-live-dot" />
              Accepting applications
            </span>
            <span className="metric-chip">Free for founding members</span>
          </div>

          {/* Headline */}
          <div className="wl-h1-wrap">
            <h1 className="wl-h1">
              <span className="wl-h1-line1">See an app.</span>
              <span className="wl-h1-line2">Build an app.</span>
            </h1>
            <div className="wl-h1-scan" aria-hidden="true" />
          </div>

          {/* Divider */}
          <div className="wl-divider" />

          {/* Subheadline */}
          <p className="wl-sub">
            Record any app. Get a UI blueprint inspired by it —<br />
            ready for your <strong>agent to design</strong>.
          </p>

          {/* Form card */}
          <div className={`wl-card-wrap${focused ? ' focused' : ''}`}>
            <div className="wl-card-bloom" aria-hidden="true" />
            <div className="wl-card">
              <div className="wl-card-scan" aria-hidden="true" />

              {formState === 'success' ? (
                <div className="wl-success-wrap">
                  <div className="wl-success-icon" aria-hidden="true">✓</div>
                  <div className="wl-success-text">
                    <strong>You&rsquo;re in.</strong>
                    We&rsquo;ll reach out to get your screen recording and build your first blueprint.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    className="wl-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    required
                    disabled={formState === 'loading'}
                  />
                  <button
                    className={`wl-btn${formState === 'loading' ? ' wl-btn-dots' : ''}`}
                    type="submit"
                    disabled={formState === 'loading'}
                  >
                    {formState === 'loading' ? 'Sending' : 'Get my free blueprint'}
                  </button>
                  {formState === 'error' && (
                    <p className="wl-error">Something went wrong — try again.</p>
                  )}
                </form>
              )}

              <p className="wl-founding">
                Founding members get a <span>lifetime discount</span> at launch.
              </p>
            </div>
          </div>

          {/* Social proof strip */}
          <div className="wl-strip">
            <span className="wl-strip-item">
              <svg className="wl-strip-icon" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 7l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Expo + React Native
            </span>
            <span className="wl-strip-sep" />
            <span className="wl-strip-item">
              <svg className="wl-strip-icon" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 5h6M4 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Every screen & component
            </span>
            <span className="wl-strip-sep" />
            <span className="wl-strip-item">
              <svg className="wl-strip-icon" viewBox="0 0 14 14" fill="none">
                <path d="M2 7c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 5v2l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Any AI agent
            </span>
          </div>
        </div>
      </main>
    </>
  )
}
