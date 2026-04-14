/**
 * SPECTR — "IDENTITY" — 6-second brand promo (360 frames @ 60fps)
 *
 * Built directly from the Spectr website's visual identity:
 *   — Background: #08090a, matches globals.css body
 *   — Aurora: radial-gradient(circle at top, rgba(113,112,255,0.14))
 *   — Grid lines: repeating-linear-gradient at 1/12 intervals
 *   — Flying wisps: violet/indigo particle trails from WaitlistClient.tsx
 *   — spectr-symbol.png + spectr-logotype.png brand assets
 *   — Neon glow: 6-layer text-shadow from .brand-neon-text
 *   — Inter font for tagline (website font)
 *   — Tagline: "See an app. Ship an app."
 *
 * Scene breakdown:
 *   F0–F80   (0.0–1.3s)  Aurora blooms, grid fades in, wisps drift into frame
 *   F60–F160 (1.0–2.7s)  Brand symbol springs up with violet glow
 *   F130–F220 (2.2–3.7s) Logotype slides in beside symbol
 *   F200–F290 (3.3–4.8s) Tagline lifts in two lines, word-staggered
 *   F270–F330 (4.5–5.5s) Eyebrow badge + spectr.to spring in
 *   F330–F360 (5.5–6.0s) Hold, gentle glow breathe, fade out
 */

import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  Img,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'

const { fontFamily: SANS } = loadInter('normal', { weights: ['300', '400', '500'] })

// ─── PALETTE (exact from globals.css) ─────────────────────────────────────────
const BG    = '#08090a'
const VI    = '113,112,255'   // --violet: #7170ff
const IN    = '94,106,210'    // --indigo: #5e6ad2
const LA    = '130,143,255'   // --lavender
const WH    = '255,255,255'

// ─── TIMING (frames @ 60fps) ──────────────────────────────────────────────────
const T = {
  AURORA_IN:      0,
  AURORA_FULL:    80,
  SYMBOL_IN:      60,
  LOGO_IN:        130,
  LOGO_FULL:      210,
  LINE1_IN:       200,
  LINE2_IN:       240,
  BADGE_IN:       270,
  URL_IN:         295,
  HOLD:           330,
  FADE_OUT:       340,
  END:            360,
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ramp(frame: number, a: number, b: number): number {
  if (a >= b) return 1
  return Math.max(0, Math.min(1, (frame - a) / (b - a)))
}

function ease(t: number): number {
  // cubic ease-out
  return 1 - Math.pow(1 - t, 3)
}

function fadeOut(frame: number, a: number, b: number): number {
  if (a >= b) return 0
  return Math.max(0, Math.min(1, 1 - (frame - a) / (b - a)))
}

// Seeded random (deterministic)
function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453
  return x - Math.floor(x)
}

// ─── WISP PARTICLE DATA (15 wisps, seeded) ────────────────────────────────────
const WISP_HUES = [VI, IN, LA, '160,170,255', '180,192,255']
const WISPS = Array.from({ length: 15 }, (_, i) => ({
  // Starting position in % of canvas
  x0:    sr(i * 7 + 0) * 100,
  y0:    sr(i * 7 + 1) * 100,
  // Drift velocity (% per 100 frames)
  dx:    (sr(i * 7 + 2) - 0.5) * 12,
  dy:    (sr(i * 7 + 3) - 0.5) * 8,
  // Visual
  hue:   WISP_HUES[Math.floor(sr(i * 7 + 4) * WISP_HUES.length)],
  alpha: 0.10 + sr(i * 7 + 5) * 0.18,
  width: 60  + sr(i * 7 + 6) * 120,   // px (tail width = blur spread)
  height: 200 + sr(i * 7 + 7) * 300,  // px (tail length)
  angle: -60 + sr(i * 7 + 8) * 120,   // degrees
  phase: sr(i * 7 + 9) * Math.PI * 2, // pulse phase offset
  // Appear delay (staggered entrance)
  start: Math.floor(sr(i * 7 + 10) * 60),
}))

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export const SpectreIdentity: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Master fade in / out
  const masterIn  = ease(ramp(frame, 0, 15))
  const masterOut = frame >= T.FADE_OUT ? fadeOut(frame, T.FADE_OUT, T.END) : 1
  const master    = masterIn * masterOut

  // Aurora build
  const auroraOp = ease(ramp(frame, T.AURORA_IN, T.AURORA_FULL)) * master

  // Slow pulse for glow elements (0 → 1 → 0 cycle, 3s period)
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * (2 / 3))

  // Brand symbol spring
  const symDelay = T.SYMBOL_IN
  const symSpring = frame >= symDelay
    ? spring({ frame: frame - symDelay, fps, config: { damping: 20, stiffness: 90, mass: 1.1 } })
    : 0
  const symOp    = ease(ramp(frame, symDelay, symDelay + 40)) * master
  const symScale = 0.55 + symSpring * 0.45
  const symY     = interpolate(symSpring, [0, 1], [60, 0])

  // Logotype slide-in
  const logoDelay = T.LOGO_IN
  const logoSpring = frame >= logoDelay
    ? spring({ frame: frame - logoDelay, fps, config: { damping: 24, stiffness: 100, mass: 0.9 } })
    : 0
  const logoOp  = ease(ramp(frame, logoDelay, T.LOGO_FULL)) * master
  const logoX   = interpolate(logoSpring, [0, 1], [-40, 0])

  // Tagline line 1: "See an app."
  const line1Spring = frame >= T.LINE1_IN
    ? spring({ frame: frame - T.LINE1_IN, fps, config: { damping: 22, stiffness: 110, mass: 0.8 } })
    : 0
  const line1Op = ease(ramp(frame, T.LINE1_IN, T.LINE1_IN + 50)) * master
  const line1Y  = interpolate(line1Spring, [0, 1], [28, 0])

  // Tagline line 2: "Ship an app."
  const line2Spring = frame >= T.LINE2_IN
    ? spring({ frame: frame - T.LINE2_IN, fps, config: { damping: 22, stiffness: 110, mass: 0.8 } })
    : 0
  const line2Op = ease(ramp(frame, T.LINE2_IN, T.LINE2_IN + 50)) * master
  const line2Y  = interpolate(line2Spring, [0, 1], [28, 0])

  // Eyebrow badge
  const badgeSpring = frame >= T.BADGE_IN
    ? spring({ frame: frame - T.BADGE_IN, fps, config: { damping: 18, stiffness: 200, mass: 0.5 } })
    : 0
  const badgeOp    = ease(ramp(frame, T.BADGE_IN, T.BADGE_IN + 30)) * master
  const badgeScale = 0.7 + badgeSpring * 0.3

  // spectr.to URL badge
  const urlSpring = frame >= T.URL_IN
    ? spring({ frame: frame - T.URL_IN, fps, config: { damping: 18, stiffness: 220, mass: 0.45 } })
    : 0
  const urlOp    = ease(ramp(frame, T.URL_IN, T.URL_IN + 25)) * master
  const urlScale = 0.6 + urlSpring * 0.4

  // Neon glow intensity (breathes with pulse)
  const glowBase = 0.7 + pulse * 0.3
  const symbolGlow = `
    0 0 ${30 * glowBase}px rgba(${VI},${0.55 * glowBase}),
    0 0 ${70 * glowBase}px rgba(${VI},${0.30 * glowBase}),
    0 0 ${120 * glowBase}px rgba(${IN},${0.15 * glowBase})
  `

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: SANS, overflow: 'hidden' }}>

      {/* ── SVG filter: film grain ── */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="grain" x="0%" y="0%" width="100%" height="100%"
            colorInterpolationFilters="linearRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4"
              stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blend" />
            <feComposite in="blend" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* ── Aurora background ── */}
      <AbsoluteFill style={{ opacity: auroraOp }}>
        {/* Primary violet bloom from top center */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 130% 65% at 50% -5%,
              rgba(${VI},0.20) 0%, transparent 55%),
            radial-gradient(ellipse 70% 45% at 12% 12%,
              rgba(${IN},0.13) 0%, transparent 48%),
            radial-gradient(ellipse 55% 35% at 88% 18%,
              rgba(${LA},0.09) 0%, transparent 48%),
            linear-gradient(180deg, #09090c 0%, #060608 60%, #010102 100%)
          `
        }} />

        {/* Grid lines (website .site-bg) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              to right,
              transparent 0,
              transparent calc(100%/12 - 1px),
              rgba(${WH},0.013) calc(100%/12 - 1px),
              rgba(${WH},0.013) calc(100%/12)
            )
          `,
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent 72%)',
        }} />
      </AbsoluteFill>

      {/* ── Flying wisp particles ── */}
      {WISPS.map((w, i) => {
        const wStart = T.AURORA_IN + w.start
        if (frame < wStart) return null
        const t = frame - wStart
        const op = w.alpha * (0.7 + 0.3 * Math.sin(t * 0.04 + w.phase)) * auroraOp
        const px = ((w.x0 + w.dx * t / 100) % 110) - 5  // wrap with margin
        const py = ((w.y0 + w.dy * t / 100) % 110) - 5
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${px}%`, top: `${py}%`,
            width: w.width,
            height: w.height,
            background: `linear-gradient(180deg, rgba(${w.hue},${op}) 0%, transparent 100%)`,
            borderRadius: '50%',
            transform: `translate(-50%,-50%) rotate(${w.angle}deg)`,
            filter: `blur(${w.width * 0.3}px)`,
            pointerEvents: 'none',
          }} />
        )
      })}

      {/* ── Brand lockup (center) ── */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
      }}>

        {/* Symbol + Logotype row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          marginBottom: 56,
        }}>
          {/* Symbol */}
          <div style={{
            opacity: symOp,
            transform: `translateY(${symY}px) scale(${symScale})`,
            position: 'relative',
          }}>
            {/* Glow ring behind symbol */}
            <div style={{
              position: 'absolute',
              inset: '-40px',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${VI},${0.38 * glowBase}) 0%, transparent 60%)`,
              filter: 'blur(18px)',
            }} />
            <Img
              src={staticFile('brand/spectr-symbol.png')}
              style={{
                width: 108,
                height: 'auto',
                display: 'block',
                position: 'relative',
                filter: `drop-shadow(0 0 28px rgba(${VI},${0.55 * glowBase})) drop-shadow(0 0 8px rgba(${WH},0.30))`,
              }}
            />
          </div>

          {/* Logotype */}
          <div style={{
            opacity: logoOp,
            transform: `translateX(${logoX}px)`,
          }}>
            <Img
              src={staticFile('brand/spectr-logotype.png')}
              style={{
                height: 52,
                width: 'auto',
                display: 'block',
                filter: `
                  drop-shadow(0 0 24px rgba(${VI},${0.35 * glowBase}))
                  drop-shadow(0 0 1.5px rgba(${WH},0.60))
                  drop-shadow(0 0 8px rgba(${WH},0.18))
                `,
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: interpolate(
            ease(ramp(frame, T.LINE1_IN - 20, T.LINE1_IN + 30)),
            [0, 1], [0, 320]
          ),
          height: 1,
          background: `rgba(${WH},0.10)`,
          marginBottom: 44,
          overflow: 'hidden',
        }} />

        {/* Tagline */}
        <div style={{
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          {/* Line 1 */}
          <div style={{
            opacity: line1Op,
            transform: `translateY(${line1Y}px)`,
            color: '#f7f8f8',
            fontSize: 74,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            fontFamily: SANS,
          }}>
            See an app.
          </div>

          {/* Line 2 */}
          <div style={{
            opacity: line2Op,
            transform: `translateY(${line2Y}px)`,
            color: '#f7f8f8',
            fontSize: 74,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            fontFamily: SANS,
          }}>
            Ship an app.
          </div>
        </div>

        {/* Eyebrow badge */}
        <div style={{
          marginTop: 36,
          opacity: badgeOp,
          transform: `scale(${badgeScale})`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          borderRadius: 9999,
          border: `1px solid rgba(${WH},0.10)`,
          background: `rgba(${WH},0.04)`,
          color: '#d0d6e0',
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '-0.01em',
        }}>
          {/* Violet pulse dot */}
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: `#7170ff`,
            boxShadow: `0 0 ${10 + pulse * 6}px rgba(${VI},0.7)`,
          }} />
          From recording to product blueprint
        </div>

      </AbsoluteFill>

      {/* ── spectr.to URL badge (bottom right) ── */}
      <div style={{
        position: 'absolute',
        bottom: 64,
        right: 80,
        opacity: urlOp,
        transform: `scale(${urlScale})`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 9999,
        border: `1px solid rgba(${WH},0.12)`,
        background: `rgba(${WH},0.05)`,
        color: '#f7f8f8',
        fontSize: 20,
        fontWeight: 400,
        letterSpacing: '0.01em',
        fontFamily: SANS,
        backdropFilter: 'blur(12px)',
      }}>
        spectr.to
      </div>

      {/* ── Cinematic letter-box bars ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 56, background: '#000000',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 56, background: '#000000',
      }} />

      {/* ── Vignette ── */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 105% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.60) 100%)`,
        pointerEvents: 'none',
      }} />

      {/* ── Film grain overlay ── */}
      <AbsoluteFill style={{
        opacity: 0.045,
        filter: 'url(#grain)',
        background: `rgba(${WH},0.5)`,
        pointerEvents: 'none',
      }} />

    </AbsoluteFill>
  )
}
