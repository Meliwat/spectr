import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { loadFont } from '@remotion/google-fonts/SpaceGrotesk'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { REAL_STRANDS } from './strand-data'

const { fontFamily } = loadFont('normal', { weights: ['500', '600', '700'] })
const { fontFamily: INTER } = loadInter('normal', { weights: ['300'] })

// ─────────────────────────────────────────────────────────
// BRAND TOKENS
// ─────────────────────────────────────────────────────────
const T = {
  bg:      '#07080f',
  text:    '#f7f8f8',
  text2:   '#d0d6e0',
  success: '#10b981',
  hues: ['113,112,255', '130,143,255', '94,106,210', '160,170,255', '180,192,255'],
  glowMid: 'rgba(113,112,255,0.40)',
  shadow1: '-2px 0px 0 rgba(255,50,120,0.11)',
  shadow2: '2px 0px 0 rgba(0,210,255,0.11)',
  shadow3: '0 0 80px rgba(113,112,255,0.28)',
  shadow4: '0 0 140px rgba(113,112,255,0.10)',
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)) }
function prog(frame: number, start: number, end: number) { return clamp((frame - start) / (end - start)) }
function easeOutExpo(t: number) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

// ─────────────────────────────────────────────────────────
// STRAND PREPROCESSING
//
// Each strand was extracted from the actual spectr-symbol.png
// pixels using ridge/peak detection — these are the real fiber
// centerlines, not synthetic approximations.
//
// yStart < 300 in original (720×893) coords = upper portion of S
//   → enter from TOP: path grows downward from first point
//
// yStart ≥ 300 = lower/middle portion of S
//   → enter from BOTTOM: points reversed so path grows upward
//
// Stagger order: strands at the extremes of the S (top-most and
// bottom-most) appear first, converging toward the S's center.
// This creates a simultaneous top+bottom build effect.
// ─────────────────────────────────────────────────────────

interface ProcessedStrand {
  pointsAttr: string   // SVG polyline points attribute
  len: number          // estimated polyline arc length (px)
  r: number; g: number; b: number  // strand color
  staggerIdx: number   // render order (0 = first to appear)
}

const PROCESSED: ProcessedStrand[] = (() => {
  // Step 1: process each raw strand
  const raw = REAL_STRANDS.map((s) => {
    const fromTop = s.yStart < 420   // 420 ≈ true vertical midpoint of the S in image coords
    const pts: number[][] = fromTop
      ? s.points.map(p => [p[0], p[1]])
      : s.points.slice().reverse().map(p => [p[0], p[1]])

    let len = 0
    for (let j = 1; j < pts.length; j++) {
      const dx = pts[j][0] - pts[j - 1][0]
      const dy = pts[j][1] - pts[j - 1][1]
      len += Math.sqrt(dx * dx + dy * dy)
    }

    return {
      pointsAttr: pts.map(([x, y]) => `${x},${y}`).join(' '),
      len,
      r: s.color[0], g: s.color[1], b: s.color[2],
      yStart: s.yStart,
    }
  })

  // Step 2: sort by extremity — strands farthest from S center appear first
  // S vertical center ≈ yStart=420 in original coords (midpoint of 45–733)
  const S_MID = 420
  const withRank = raw
    .map((s, i) => ({ i, dist: Math.abs(s.yStart - S_MID) }))
    .sort((a, b) => b.dist - a.dist)   // most extreme first

  const result: ProcessedStrand[] = new Array(raw.length)
  withRank.forEach(({ i }, rank) => {
    result[i] = { ...raw[i], staggerIdx: rank }
  })
  return result
})()

// ─────────────────────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────────────────────
type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; hueIdx: number; phase: number }
function buildParticles(n: number): P[] {
  let s = 42
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  return Array.from({ length: n }, () => ({
    x: rng(), y: rng(),
    vx: (rng() - 0.5) * 0.00012, vy: (rng() - 0.5) * 0.00012,
    r: 1 + rng() * 2.5, alpha: 0.15 + rng() * 0.50,
    hueIdx: Math.floor(rng() * T.hues.length), phase: rng() * Math.PI * 2,
  }))
}
const PARTICLES = buildParticles(200)

// ─────────────────────────────────────────────────────────
// LAYERS
// ─────────────────────────────────────────────────────────
function Aurora({ frame }: { frame: number }) {
  const b  = 0.5 + 0.5 * Math.sin(frame * 0.018)
  const sh = 0.5 + 0.5 * Math.sin(frame * 0.012 + 1.2)
  return (
    <AbsoluteFill style={{
      background: [
        `radial-gradient(ellipse 90% 70% at ${20 + sh * 10}% ${30 + b * 8}%, rgba(94,106,210,${0.18 + b * 0.08}) 0%, transparent 60%)`,
        `radial-gradient(ellipse 80% 60% at ${75 + b * 5}% 65%, rgba(113,112,255,${0.12 + sh * 0.06}) 0%, transparent 60%)`,
        `radial-gradient(ellipse 70% 90% at 50% 0%, rgba(130,143,255,${0.22 + b * 0.10}) 0%, transparent 55%)`,
      ].join(','),
    }} />
  )
}

function Grid({ opacity }: { opacity: number }) {
  return (
    <AbsoluteFill style={{ opacity }}>
      {Array.from({ length: 13 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${(i / 12) * 100}%`,
          top: 0, bottom: 0, width: 1,
          background: 'rgba(255,255,255,0.032)',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(7,8,15,0.85) 80%)',
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  )
}

function Particles({ frame, opacity }: { frame: number; opacity: number }) {
  const { width, height } = useVideoConfig()
  return (
    <AbsoluteFill style={{ opacity }}>
      {PARTICLES.map((p, i) => {
        const x = ((p.x + p.vx * frame * 60) % 1 + 1) % 1
        const y = ((p.y + p.vy * frame * 60) % 1 + 1) % 1
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.04 + p.phase)
        const a = p.alpha * pulse
        const hue = T.hues[p.hueIdx]
        return (
          <div key={i} style={{
            position: 'absolute', left: x * width, top: y * height,
            width: p.r * 2, height: p.r * 2, borderRadius: '50%',
            transform: 'translate(-50%,-50%)',
            background: `rgba(${hue},${a})`,
            boxShadow: `0 0 ${p.r * 5}px rgba(${hue},${a * 0.5})`,
          }} />
        )
      })}
    </AbsoluteFill>
  )
}

function ScanLine({ triggerFrame, frame, containerW = 900 }: { triggerFrame: number; frame: number; containerW?: number }) {
  const elapsed = frame - triggerFrame
  if (elapsed < 0 || elapsed > 55) return null
  const t   = clamp(elapsed / 45)
  const top = easeInOut(t) * 100
  const a   = elapsed < 8 ? elapsed / 8 : elapsed > 40 ? 1 - (elapsed - 40) / 15 : 1
  return (
    <div style={{
      position: 'absolute', top: `${top}%`, left: '50%',
      transform: 'translateX(-50%)',
      width: containerW, height: 2,
      background: `linear-gradient(90deg, transparent, ${T.glowMid} 20%, rgba(255,255,255,0.85) 50%, ${T.glowMid} 80%, transparent)`,
      opacity: a, pointerEvents: 'none',
    }} />
  )
}

function Headline({ line1P, line2P }: { line1P: number; line2P: number }) {
  const base: React.CSSProperties = {
    fontFamily, fontSize: 132, fontWeight: 700,
    letterSpacing: '-0.04em', lineHeight: 1.0, display: 'block',
  }
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <span style={{
        ...base, color: T.text, opacity: line1P,
        transform: `translateY(${interpolate(line1P, [0, 1], [70, 0])}px)`,
        filter: `blur(${interpolate(line1P, [0, 0.4, 1], [14, 3, 0])}px)`,
        textShadow: [T.shadow1, T.shadow2, T.shadow3, T.shadow4].join(','),
        willChange: 'transform,opacity,filter',
      }}>See an app.</span>
      <span style={{
        ...base, color: 'rgba(180,192,255,0.88)', opacity: line2P,
        transform: `translateY(${interpolate(line2P, [0, 1], [70, 0])}px)`,
        filter: `blur(${interpolate(line2P, [0, 0.4, 1], [14, 3, 0])}px)`,
        textShadow: '0 0 60px rgba(130,143,255,0.60), 0 0 140px rgba(113,112,255,0.28)',
        willChange: 'transform,opacity,filter',
      }}>Ship an app.</span>
    </div>
  )
}

function Divider({ p }: { p: number }) {
  if (p <= 0) return null
  return (
    <div style={{
      width: 80, height: 1, margin: '0 auto',
      background: `linear-gradient(90deg, transparent, ${T.glowMid}, rgba(255,255,255,0.45), ${T.glowMid}, transparent)`,
      transform: `scaleX(${easeOutExpo(p)})`, opacity: clamp(p * 3),
    }} />
  )
}

function Tagline({ p }: { p: number }) {
  return (
    <div style={{
      fontFamily, fontSize: 30, fontWeight: 500,
      letterSpacing: '-0.015em', color: T.text2,
      textAlign: 'center', lineHeight: 1.55,
      opacity: p, transform: `translateY(${interpolate(easeOutExpo(p), [0, 1], [36, 0])}px)`,
    }}>
      Record any app. Get a UI blueprint —<br />
      <span style={{ color: 'rgba(160,170,255,0.92)', fontWeight: 600 }}>
        ready for your AI agent to build.
      </span>
    </div>
  )
}

function URLBadge({ p }: { p: number }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 18,
      padding: '14px 36px', borderRadius: 99,
      border: '1.5px solid rgba(113,112,255,0.55)',
      background: 'rgba(113,112,255,0.16)',
      opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.82, 1])})`,
      boxShadow: '0 0 60px rgba(113,112,255,0.22), 0 0 120px rgba(113,112,255,0.10)',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: T.success, boxShadow: '0 0 14px rgba(16,185,129,1)',
      }} />
      <span style={{
        fontFamily, fontSize: 28, fontWeight: 600,
        color: 'rgba(210,220,255,0.95)', letterSpacing: '-0.015em',
      }}>spectr.to</span>
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// MAIN COMPOSITION  (8s × 60fps = 480 frames)
// ─────────────────────────────────────────────────────────
export const SpectrePromo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const globalOut = interpolate(frame, [458, 480], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const particleA = clamp(prog(frame, 0, 40) * 1.4)

  // ── Phase 1: Headline (0–208) ─────────────────────────
  const line1      = spring({ frame, fps, from: 0, to: 1, config: { damping: 14, stiffness: 120, mass: 0.7 }, delay: 8 })
  const line2      = spring({ frame, fps, from: 0, to: 1, config: { damping: 14, stiffness: 110, mass: 0.8 }, delay: 50 })
  const divP       = prog(frame, 80, 125)
  const tagP       = easeOutExpo(prog(frame, 120, 170))
  const headlineOut = interpolate(frame, [175, 202], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const headlineA   = interpolate(frame, [5, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * headlineOut * globalOut
  const flashA      = interpolate(frame, [174, 185, 197, 208], [0, 0.45, 0.45, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // ── Phase 2: Real fiber strand assembly (208–315) ─────
  const STRAND_START = 208
  const STRAND_STAG  = 0.7   // frames between strands (100 strands × 0.7 = 70f build)
  const N = PROCESSED.length
  const STRAND_DONE  = Math.round(STRAND_START + (N - 1) * STRAND_STAG + 38)

  // spring() is a pure function — safe to call in a loop
  const strandTs = PROCESSED.map(s =>
    spring({
      frame, fps, from: 0, to: 1,
      config: { damping: 22, stiffness: 78, mass: 1.05 },
      delay: STRAND_START + s.staggerIdx * STRAND_STAG,
    })
  )

  // ── Neon tagline ──────────────────────────────────────
  const NEON_IN    = STRAND_DONE + 22
  const neonL1     = spring({ frame, fps, from: 0, to: 1, config: { damping: 16, stiffness: 100, mass: 0.8  }, delay: NEON_IN })
  const neonL2     = spring({ frame, fps, from: 0, to: 1, config: { damping: 16, stiffness: 95,  mass: 0.85 }, delay: NEON_IN + 36 })
  const neonOp     = clamp(prog(frame, NEON_IN, NEON_IN + 22)) * globalOut
  const neonPulse  = 0.7 + 0.3 * Math.sin(frame * 0.05)
  const neonShadow = [
    `0 0 3px rgba(255,255,255,1)`,
    `0 0 8px rgba(255,255,255,0.85)`,
    `0 0 18px rgba(255,255,255,${(0.45 + neonPulse * 0.15).toFixed(2)})`,
    `0 0 36px rgba(200,212,255,${(0.40 + neonPulse * 0.15).toFixed(2)})`,
    `0 0 70px rgba(160,180,255,${(0.22 + neonPulse * 0.12).toFixed(2)})`,
    `0 0 110px rgba(130,150,255,${(0.12 + neonPulse * 0.08).toFixed(2)})`,
  ].join(', ')

  const urlP = spring({ frame, fps, from: 0, to: 1, config: { damping: 18, stiffness: 70 }, delay: NEON_IN + 82 })

  // Logo bottom Y in canvas coords (for neon text placement)
  // With SYM_H=610, CY=415: bottom = 415 + 305 = 720
  const LOGO_BOTTOM = 724

  return (
    <AbsoluteFill style={{ background: T.bg, overflow: 'hidden' }}>

      <Aurora frame={frame} />
      <Grid opacity={interpolate(particleA, [0, 1], [0, 0.75])} />
      <Particles frame={frame} opacity={particleA} />
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 110% 90% at 50% 50%, transparent 38%, rgba(1,1,2,0.70) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Phase 1: Headline ── */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: headlineA,
      }}>
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <Headline line1P={line1} line2P={line2} />
          <ScanLine triggerFrame={8}  frame={frame} containerW={960} />
          <ScanLine triggerFrame={50} frame={frame} containerW={960} />
        </div>
        <div style={{ marginBottom: 44 }}><Divider p={divP} /></div>
        <Tagline p={tagP} />
      </AbsoluteFill>

      {/* Cut flash */}
      <AbsoluteFill style={{ background: '#ffffff', opacity: flashA, pointerEvents: 'none' }} />

      {/* ── Phase 2: Real fiber strands assembling the S ── */}
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: globalOut }}>
        {/* Unified glow haze behind the whole S — builds as strands arrive */}
        {(() => {
          const avgT = clamp(strandTs.reduce((a, t) => a + t, 0) / strandTs.length * 1.8)
          const hazeAlpha = avgT * 0.55
          return (
            <div style={{
              position: 'absolute',
              left: 960 - 260, top: 415 - 320,
              width: 520, height: 640,
              borderRadius: '50%',
              background: [
                `radial-gradient(ellipse 55% 45% at 48% 30%, rgba(150,130,255,${hazeAlpha * 0.7}) 0%, transparent 70%)`,
                `radial-gradient(ellipse 55% 45% at 52% 70%, rgba(0,210,220,${hazeAlpha * 0.6}) 0%, transparent 70%)`,
              ].join(','),
              filter: 'blur(28px)',
              pointerEvents: 'none',
            }} />
          )
        })()}

        <svg
          width={1920} height={1080}
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <defs>
            {/* Bloom filter for the glow halo layer */}
            <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {PROCESSED.map((s, i) => {
            const t = strandTs[i]
            const offset = s.len * (1 - t)
            const alpha  = clamp(t * 1.8)
            // Boost to near-full saturation for fiber-optic vibrancy
            const br = Math.min(255, Math.round(s.r * 2.2))
            const bg = Math.min(255, Math.round(s.g * 2.2))
            const bb = Math.min(255, Math.round(s.b * 2.2))
            return (
              <g key={i} opacity={alpha}>
                {/* Wide soft glow halo — bloom filtered */}
                <polyline
                  points={s.pointsAttr}
                  stroke={`rgba(${br},${bg},${bb},0.28)`}
                  strokeWidth={16}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.len}
                  strokeDashoffset={offset}
                  filter="url(#bloom)"
                />
                {/* Medium mid-glow */}
                <polyline
                  points={s.pointsAttr}
                  stroke={`rgba(${br},${bg},${bb},0.50)`}
                  strokeWidth={4.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.len}
                  strokeDashoffset={offset}
                />
                {/* Crisp fiber core */}
                <polyline
                  points={s.pointsAttr}
                  stroke={`rgba(${br},${bg},${bb},1.0)`}
                  strokeWidth={1.6}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.len}
                  strokeDashoffset={offset}
                />
              </g>
            )
          })}
        </svg>
      </AbsoluteFill>

      {/* ── Neon "See an app. / Ship an app." + URL badge ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: LOGO_BOTTOM + 24,
        opacity: neonOp, textAlign: 'center', lineHeight: 1.08,
      }}>
        {([['See an app.', neonL1], ['Ship an app.', neonL2]] as [string, number][]).map(([text, sp], idx) => (
          <div key={idx} style={{
            fontFamily: INTER, fontSize: 72, fontWeight: 300,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ffffff',
            opacity: sp,
            transform: `translateY(${interpolate(sp, [0, 1], [24, 0])}px)`,
            textShadow: neonShadow, display: 'block',
          }}>
            {text}
          </div>
        ))}
        {/* URL badge — flows below the two text lines */}
        <div style={{
          marginTop: 32, display: 'flex', justifyContent: 'center',
          opacity: urlP,
          transform: `scale(${interpolate(urlP, [0, 1], [0.82, 1])})`,
        }}>
          <URLBadge p={1} />
        </div>
      </div>

      {/* Letterbox */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: '#000' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: '#000' }} />

    </AbsoluteFill>
  )
}
