/**
 * SPECTR — "SIGNAL" — 6-second promo (360 frames @ 60fps)
 *
 * Spec source: ANIMATION_SPEC.md
 *
 * Narrative arc:
 *   Act I  (f0–f110):   A screen recording arrives as raw signal — amber waveform
 *                        pulses across a dark canvas. This is the app, as data.
 *   Act II (f95–f265):  Spectr's pipeline fires. The waveform is sliced into
 *                        vertical frequency columns (the frames being extracted).
 *                        Columns are classified, sorted, labeled — cyan precision.
 *   Act III (f265–f360): Everything collapses into a single point of violet light.
 *                        SPECTR assembles from six directions simultaneously.
 *                        Neon bloom. Tagline. spectr.to.
 *
 * Hero frame: f338 — all six chars locked, first bloom peak, divider at 50%.
 *
 * Spec compliance:
 *   Colors:  AMBER #f59e0b | CYAN #00e5ff | VIOLET #7170ff | BG #000508
 *   Fonts:   Orbitron 900 (wordmark) | Share Tech Mono 400 (readout/tagline)
 *   Springs: per ANIMATION_SPEC.md §2.6
 *   Glow:    6-layer shadow per §5.7.6
 *   Always:  grain (feTurbulence baseFreq 0.68, 4 octaves, overlay 0.07)
 *            bars (64px, z-index 200)
 *            vignette (ellipse 105%/90%, transparent 38%, rgba(0,5,8,0.72))
 *            corners (42px arms, 1.5px stroke, rgba(255,255,255,0.22))
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
import { loadFont as loadOrbitron  } from '@remotion/google-fonts/Orbitron'
import { loadFont as loadShareMono } from '@remotion/google-fonts/ShareTechMono'

const { fontFamily: DISPLAY } = loadOrbitron('normal',  { weights: ['900'] })
const { fontFamily: MONO }    = loadShareMono('normal', { weights: ['400'] })

// ─── SPEC COLORS (§2.5) ───────────────────────────────────────────────────────
const C = {
  bg:     '#000508',
  amber:  '#f59e0b',
  cyan:   '#00e5ff',
  vi:     '#7170ff',
  white:  '#ffffff',
  green:  '#10b981',
  a: (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`,
}

// ─── TIMING (frames @ 60fps) ──────────────────────────────────────────────────
const T = {
  // Act I — Signal
  GRID_IN:         [  0,  30] as [number,number],
  WAVE_IN:         [  0,  60] as [number,number],
  WAVE_PULSE:       20,                  // wave starts pulsing
  LABEL_WAVE:      [  30,  55] as [number,number],

  // Act II — Extraction
  FRAG_START:        90,
  FRAG_END:         185,
  COLS_SETTLE:      200,
  COL_LABELS_IN:   [180, 215] as [number,number],
  SORT_START:       200,
  SORT_END:         255,
  READOUT_IN:      [ 80, 105] as [number,number],
  READOUT_LINES:    [ 80, 115, 145, 170] as number[],

  // Act III — Revelation
  COLLAPSE_START:   250,
  COLLAPSE_END:     295,
  FLASH_IN:        [288, 296] as [number,number],
  FLASH_OUT:       [296, 308] as [number,number],
  CHARS_START:      302,
  CHARS_STAGGER:      9,
  BLOOM_IN:        [340, 355] as [number,number],
  DIVIDER_IN:      [325, 352] as [number,number],
  TAG_IN:          [338, 358] as [number,number],
  URL_IN:          [348, 360] as [number,number],

  // Always
  CORNERS_IN:      [ 12,  40] as [number,number],
  CORNERS_OUT:     [278, 308] as [number,number],
  FADE:            [350, 360] as [number,number],
}

// ─── MATH ─────────────────────────────────────────────────────────────────────
const clamp  = (v: number) => Math.max(0, Math.min(1, v))
const ramp   = (f: number, a: number, b: number) => a >= b ? 1 : clamp(interpolate(f, [a, b], [0, 1]))
const fade   = (f: number, a: number, b: number) => a >= b ? 0 : clamp(interpolate(f, [a, b], [1, 0]))
const rampR  = (f: number, r: [number,number]) => ramp(f, r[0], r[1])
const fadeR  = (f: number, r: [number,number]) => fade(f, r[0], r[1])

// ─── SEEDED RANDOM (§8.1) ─────────────────────────────────────────────────────
const sr = (seed: number) => { const x = Math.sin(seed + 1) * 43758.5453; return x - Math.floor(x) }

// ─── PRE-BAKED DATA ───────────────────────────────────────────────────────────

// Waveform: 80 bars across canvas width
const WAVE_BARS = Array.from({ length: 80 }, (_, i) => ({
  h:     0.15 + sr(i * 3)  * 0.70,   // base height ratio 0.15–0.85
  phase: sr(i * 7) * Math.PI * 2,    // phase offset for pulse animation
  speed: 0.8 + sr(i * 11) * 0.6,     // pulse speed multiplier
  isBright: sr(i * 17) > 0.72,       // 28% bars are brighter accent bars
}))

// Frequency columns: 24 columns (like extracted frames)
const COL_COUNT = 24
const COLS = Array.from({ length: COL_COUNT }, (_, i) => ({
  h:       0.12 + sr(i * 5)  * 0.78,   // height ratio
  delay:   sr(i * 9)  * 20,            // fragmentation delay (frames)
  sortDelay: sr(i * 13) * 25,          // sort animation delay
  label:   `F${String(i + 1).padStart(2, '0')}`,
  isCyan:  sr(i * 19) > 0.3,           // 70% cyan, 30% amber
}))

// Collapse particles: 64 (spec §5.4.1 uses 56; here 64 for this composition)
const PARTICLES = Array.from({ length: 64 }, (_, i) => ({
  angle: sr(i * 3) * Math.PI * 2,
  speed: 0.3 + sr(i * 7) * 0.7,
  size:  1.0 + sr(i * 11) * 3.5,
  life:  0.45 + sr(i * 13) * 0.55,
  isCyan: sr(i * 17) > 0.3,
}))

// Wordmark character entry directions (six unique angles, not all from below)
const CHAR_DIRS = [
  { dx: -60, dy:  30 },  // S — from bottom-left
  { dx:   0, dy:  50 },  // P — from below
  { dx:  50, dy:  20 },  // E — from bottom-right
  { dx: -40, dy: -30 },  // C — from top-left
  { dx:   0, dy: -50 },  // T — from above
  { dx:  55, dy: -20 },  // R — from top-right
]
const CHARS = ['S','P','E','C','T','R']

// ─── ALWAYS-ON: BACKGROUND ────────────────────────────────────────────────────
function Background() {
  return <AbsoluteFill style={{ background: C.bg }} />
}

// ─── ALWAYS-ON: GRAIN (§4.2) ──────────────────────────────────────────────────
function Grain() {
  return (
    <svg width={1920} height={1080}
      style={{ position:'absolute', inset:0, mixBlendMode:'overlay',
               pointerEvents:'none', opacity:0.07 }}>
      <filter id="sg">
        <feTurbulence type="fractalNoise" baseFrequency="0.68"
          numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#sg)"/>
    </svg>
  )
}

// ─── ALWAYS-ON: BARS (§4.3) ───────────────────────────────────────────────────
function Bars() {
  return (
    <>
      <div style={{ position:'absolute', top:0, left:0, right:0,
        height:64, background:C.bg, zIndex:200 }}/>
      <div style={{ position:'absolute', bottom:0, left:0, right:0,
        height:64, background:C.bg, zIndex:200 }}/>
    </>
  )
}

// ─── ALWAYS-ON: VIGNETTE (§4.4) ──────────────────────────────────────────────
function Vignette() {
  return (
    <AbsoluteFill style={{
      background:'radial-gradient(ellipse 105% 90% at 50% 50%, transparent 38%, rgba(0,5,8,0.72) 100%)',
      pointerEvents:'none', zIndex:10,
    }}/>
  )
}

// ─── ALWAYS-ON: CORNERS (§4.5) ───────────────────────────────────────────────
function Corners({ opacity }: { opacity: number }) {
  const L = 42, W = 1.5
  const col = `rgba(255,255,255,${0.22 * opacity})`
  return (
    <svg width={1920} height={1080}
      style={{ position:'absolute', inset:0, opacity, zIndex:8 }}>
      {/* TL */ }
      <line x1={60} y1={76} x2={102} y2={76} stroke={col} strokeWidth={W}/>
      <line x1={60} y1={76} x2={60}  y2={118} stroke={col} strokeWidth={W}/>
      {/* TR */}
      <line x1={1860} y1={76} x2={1818} y2={76} stroke={col} strokeWidth={W}/>
      <line x1={1860} y1={76} x2={1860} y2={118} stroke={col} strokeWidth={W}/>
      {/* BL */}
      <line x1={60} y1={1004} x2={102} y2={1004} stroke={col} strokeWidth={W}/>
      <line x1={60} y1={1004} x2={60}  y2={962} stroke={col} strokeWidth={W}/>
      {/* BR */}
      <line x1={1860} y1={1004} x2={1818} y2={1004} stroke={col} strokeWidth={W}/>
      <line x1={1860} y1={1004} x2={1860} y2={962} stroke={col} strokeWidth={W}/>
    </svg>
  )
}

// ─── SUBTLE GRID ─────────────────────────────────────────────────────────────
function Grid({ opacity }: { opacity: number }) {
  const cols = 20, rows = 12
  const cw = 1920/cols, rh = 952/rows
  return (
    <svg width={1920} height={1080}
      style={{ position:'absolute', inset:0, opacity }}>
      {Array.from({length:cols+1},(_,i)=>(
        <line key={`c${i}`} x1={i*cw} y1={64} x2={i*cw} y2={1016}
          stroke="rgba(255,255,255,0.025)" strokeWidth={1}/>
      ))}
      {Array.from({length:rows+1},(_,i)=>(
        <line key={`r${i}`} x1={0} y1={64+i*rh} x2={1920} y2={64+i*rh}
          stroke="rgba(255,255,255,0.025)" strokeWidth={1}/>
      ))}
    </svg>
  )
}

// ─── ACT I: WAVEFORM ─────────────────────────────────────────────────────────
// 80 vertical bars centered vertically at canvas midpoint.
// Each bar pulses using its seeded phase + speed for organic motion.
// Color is amber, transitioning to cyan as fragmentation begins.
function Waveform({ frame, opacity, colorProgress }: {
  frame: number
  opacity: number
  colorProgress: number   // 0=amber, 1=cyan
}) {
  const CX = 1920, CY = 540
  const barW = CX / 80            // 24px each
  const maxH = 340                // max bar half-height (px)

  return (
    <svg width={1920} height={1080}
      style={{ position:'absolute', inset:0, opacity }}>
      <defs>
        <filter id="wave-glow" x="-20%" y="-20%" width="140%" height="140%"
          colorInterpolationFilters="linearRGB">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#wave-glow)">
        {WAVE_BARS.map(({ h, phase, speed, isBright }, i) => {
          // Pulse: height oscillates gently
          const pulse = Math.sin(frame * 0.06 * speed + phase) * 0.18 + 0.82
          const barH  = h * pulse * maxH

          // Color: amber → cyan as colorProgress rises
          const amber  = [245, 158, 11]
          const cyan   = [0, 229, 255]
          const r = Math.round(amber[0] + (cyan[0]-amber[0])*colorProgress)
          const g = Math.round(amber[1] + (cyan[1]-amber[1])*colorProgress)
          const b = Math.round(amber[2] + (cyan[2]-amber[2])*colorProgress)
          const baseOp = isBright ? 0.75 : 0.35
          const fill   = `rgba(${r},${g},${b},${baseOp})`

          const x = i * barW + barW * 0.15
          const w = barW * 0.7
          const y = CY - barH
          const totalH = barH * 2

          return (
            <rect key={i}
              x={x} y={y} width={w} height={totalH}
              rx={w * 0.4}
              fill={fill}
            />
          )
        })}
      </g>
    </svg>
  )
}

// ─── ACT I: WAVEFORM LABEL ───────────────────────────────────────────────────
function WaveLabel({ opacity }: { opacity: number }) {
  return (
    <div style={{
      position:'absolute', bottom:88+32, left:80,
      fontFamily:MONO, fontSize:12,
      color:`rgba(245,158,11,0.60)`,
      letterSpacing:'0.12em', textTransform:'uppercase',
      opacity,
    }}>
      {'> screen_recording.mp4 · analyzing signal'}
    </div>
  )
}

// ─── ACT II: FREQUENCY COLUMNS ────────────────────────────────────────────────
// 24 columns appear as the waveform fragments into discrete extracted frames.
// They're sorted by height (simulating Spectr ranking frames by uniqueness).
function FrequencyColumns({ frame, fps, opacity, sortProgress }: {
  frame: number; fps: number
  opacity: number
  sortProgress: number    // 0 = original order, 1 = sorted by height
}) {
  const fragProgress = ramp(frame, T.FRAG_START, T.FRAG_END)

  // Sorted heights (tallest first)
  const sortedIndices = [...COLS]
    .map((c, i) => ({ h: c.h, i }))
    .sort((a, b) => b.h - a.h)
    .map(x => x.i)

  const totalW = 1920 - 160   // 80px margin each side
  const colW   = totalW / COL_COUNT
  const maxH   = 520

  return (
    <svg width={1920} height={1080}
      style={{ position:'absolute', inset:0, opacity }}>
      <defs>
        <filter id="col-glow" x="-30%" y="-20%" width="160%" height="140%"
          colorInterpolationFilters="linearRGB">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#col-glow)">
        {COLS.map(({ h, delay, label, isCyan }, i) => {
          // Entry: each column rises up with its own delay
          const localFrag = clamp(interpolate(frame,
            [T.FRAG_START + delay, T.FRAG_END + delay * 0.3], [0, 1]))

          // Sort: interpolate x position from original to sorted
          const sortedPos = sortedIndices.indexOf(i)
          const origX = 80 + i * colW + colW * 0.1
          const sortX = 80 + sortedPos * colW + colW * 0.1

          const sp = spring({
            frame: frame - T.SORT_START - (sortedPos * 2),
            fps,
            config: { damping: 22, stiffness: 90, mass: 0.8 }
          })
          const cx = sortProgress > 0
            ? origX + (sortX - origX) * sp
            : origX

          const barH  = h * maxH * localFrag
          const barW  = colW * 0.65
          const y     = 1016 - barH
          const col   = isCyan
            ? C.a(0,229,255, 0.55 + (h * 0.35))
            : C.a(0,180,220, 0.35 + (h * 0.25))

          // Collapse: bars shrink to center
          const collapseP = ramp(frame, Math.min(T.COLLAPSE_START + i*2, T.COLLAPSE_END - 1), T.COLLAPSE_END)
          const colH = barH * (1 - collapseP)
          const colY = 1016 - colH

          return (
            <g key={i}>
              <rect
                x={cx} y={colY} width={barW} height={colH}
                rx={barW * 0.3}
                fill={col}
                opacity={1 - collapseP * 0.95}
              />
              {/* Frame label below bar */}
              {localFrag > 0.6 && sortProgress < 0.5 && collapseP < 0.3 && (
                <text
                  x={cx + barW/2} y={1016 + 16}
                  textAnchor="middle"
                  fontFamily={MONO} fontSize={9}
                  fill={C.a(0,229,255,0.40 * (1 - collapseP))}
                  letterSpacing="0.05em">
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ─── ACT II: READOUT TEXT ────────────────────────────────────────────────────
const READOUT_LINES_TEXT = [
  '> extracting frames................[48/48]',
  '> running vision analysis.........[ 2/ 2]',
  '> generating spec sections........[ 7/ 7]',
  '> spec.md complete ✓',
]

function Readout({ frame, opacity }: { frame: number; opacity: number }) {
  return (
    <div style={{
      position:'absolute', top:88+16, left:80,
      fontFamily:MONO, fontSize:12,
      letterSpacing:'0.05em',
      lineHeight:2.0,
      opacity,
    }}>
      {READOUT_LINES_TEXT.map((line, i) => {
        const startFrame = T.READOUT_LINES[i] ?? 80
        const lineOp = ramp(frame, startFrame, startFrame + 20)
        const isDone = line.includes('✓')
        return (
          <div key={i} style={{
            color: isDone
              ? C.a(16,185,129,0.9)
              : i < 3
                ? C.a(0,229,255, 0.4 + lineOp * 0.4)
                : C.a(255,255,255,0.5),
            opacity: lineOp,
          }}>
            {line}
          </div>
        )
      })}
    </div>
  )
}

// ─── ACT III: COLLAPSE PARTICLES (§5.4) ──────────────────────────────────────
function CollapseParticles({ frame }: { frame: number }) {
  const progress = ramp(frame, T.COLLAPSE_START, T.COLLAPSE_END)
  if (progress <= 0) return null
  const cx = 960, cy = 540
  return (
    <svg width={1920} height={1080}
      style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      {PARTICLES.map(({ angle, speed, size, life, isCyan }, i) => {
        const maxR = 310 * speed
        const r    = progress * maxR
        const pOp  = Math.max(0, 1 - progress / life)
        const x    = cx + Math.cos(angle) * r
        const y    = cy + Math.sin(angle) * r
        const col  = isCyan
          ? C.a(0,229,255, pOp * 0.70)
          : C.a(255,255,255, pOp * 0.50)
        return (
          <circle key={i} cx={x} cy={y}
            r={size * (1 - progress * 0.5)}
            fill={col}/>
        )
      })}
    </svg>
  )
}

// ─── ACT III: FLASH (§5.5) ────────────────────────────────────────────────────
function Flash({ frame }: { frame: number }) {
  const rIn  = rampR(frame, T.FLASH_IN)
  const rOut = fadeR(frame, T.FLASH_OUT)
  const op   = Math.min(rIn, rOut)
  if (op <= 0) return null
  return <AbsoluteFill style={{ background:C.white, opacity:op, zIndex:50 }}/>
}

// ─── ACT III: WORDMARK (§5.7) — chars from six unique directions ─────────────
function Wordmark({ frame, fps }: { frame: number; fps: number }) {
  const overallOp = ramp(frame, T.CHARS_START, T.CHARS_START + 12)
  const bloomProg = rampR(frame, T.BLOOM_IN)
  const breathe   = Math.sin((frame - T.BLOOM_IN[1]) * 0.04) * 0.5 + 0.5

  // 6-layer neon glow (§5.7.6)
  const neon = bloomProg > 0 ? [
    `0 0 ${3  + breathe*3}px  rgba(255,255,255,${0.95*bloomProg})`,
    `0 0 ${8  + breathe*5}px  rgba(255,255,255,${0.80*bloomProg})`,
    `0 0 ${18 + breathe*10}px rgba(255,255,255,${0.55*bloomProg})`,
    `0 0 ${40 + breathe*20}px rgba(255,255,255,${0.30*bloomProg})`,
    `0 0 ${80 + breathe*35}px rgba(200,210,255,${0.18*bloomProg})`,
    `0 0 ${140+ breathe*50}px rgba(160,175,255,${0.10*bloomProg})`,
  ].join(',') : 'none'

  return (
    <div style={{
      display:'flex', alignItems:'baseline', justifyContent:'center',
      opacity: overallOp,
    }}>
      {CHARS.map((ch, i) => {
        const { dx, dy } = CHAR_DIRS[i]
        const charF = frame - T.CHARS_START - i * T.CHARS_STAGGER
        const sp = spring({
          frame: charF,
          fps,
          config: { damping: 24, stiffness: 130, mass: 0.7 },  // §2.6 SPRING_CHARS
        })

        // Glitch window (§5.7.3)
        const G = 14
        const inGlitch = charF > 0 && charF < G
        const gx = inGlitch
          ? interpolate(charF, [0, G], [6, 0]) * (Math.sin(charF*8.7)>0?1:-1)
          : 0
        const gy = inGlitch
          ? interpolate(charF, [0, G], [4, 0]) * (Math.sin(charF*6.1)>0?1:-1)
          : 0
        const gOp = inGlitch
          ? 0.4 + 0.6 * Math.abs(Math.sin(charF * 11.3))
          : sp

        // Direction-based entry: characters come from unique angles
        const entryX = dx * (1 - sp)
        const entryY = dy * (1 - sp)

        return (
          <span key={i} style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 168,
            letterSpacing: '0.10em',
            color: C.white,
            lineHeight: 1,
            display: 'inline-block',
            opacity: gOp,
            transform: `translateX(${entryX + gx}px) translateY(${entryY + gy}px)`,
            textShadow: neon,
          }}>
            {ch}
          </span>
        )
      })}
    </div>
  )
}

// ─── DIVIDER (§5.8) ───────────────────────────────────────────────────────────
function Divider({ frame }: { frame: number }) {
  const prog = rampR(frame, T.DIVIDER_IN)
  return (
    <div style={{
      width: 420 * prog, height:1, margin:'22px auto 0',
      opacity: prog,
      background:`linear-gradient(90deg,
        transparent,
        rgba(113,112,255,0.60) 20%,
        rgba(255,255,255,0.35) 50%,
        rgba(113,112,255,0.60) 80%,
        transparent)`,
    }}/>
  )
}

// ─── TAGLINE (§5.9) ───────────────────────────────────────────────────────────
function Tagline({ frame }: { frame: number }) {
  const op = rampR(frame, T.TAG_IN)
  const ty = interpolate(op, [0,1], [18,0])
  return (
    <div style={{
      marginTop:28,
      fontFamily:MONO, fontSize:20,
      letterSpacing:'0.28em',
      color:'rgba(255,255,255,0.50)',
      textTransform:'uppercase',
      opacity:op,
      transform:`translateY(${ty}px)`,
      textAlign:'center',
    }}>
      See an app.&nbsp;&nbsp;&nbsp;Ship an app.
    </div>
  )
}

// ─── URL BADGE (§5.10) ────────────────────────────────────────────────────────
function URLBadge({ frame, fps }: { frame: number; fps: number }) {
  const sp = spring({ frame: frame - T.URL_IN[0], fps,
    config: { damping: 16, stiffness: 85, mass: 1.0 } })
  const op = rampR(frame, T.URL_IN)
  return (
    <div style={{
      position:'absolute', bottom:88, right:100,
      display:'flex', alignItems:'center', gap:10,
      opacity: op * sp,
      transform:`scale(${sp})`,
      transformOrigin:'bottom right',
    }}>
      <div style={{
        width:8, height:8, borderRadius:'50%',
        background: C.green,
        boxShadow:`0 0 10px rgba(16,185,129,0.90), 0 0 20px rgba(16,185,129,0.40)`,
      }}/>
      <div style={{
        fontFamily:MONO, fontSize:17,
        color:'rgba(255,255,255,0.45)',
        letterSpacing:'0.18em',
      }}>
        spectr.to
      </div>
    </div>
  )
}

// ─── COLLAPSE IMPLODE POINT ────────────────────────────────────────────────────
// As the columns collapse to center, a bright violet point of light builds
function ImplodePoint({ frame }: { frame: number }) {
  const prog    = ramp(frame, T.COLLAPSE_START + 20, T.COLLAPSE_END)
  const flashOp = rampR(frame, T.FLASH_IN) * fadeR(frame, T.FLASH_OUT)
  const op      = prog * (1 - flashOp)
  if (op <= 0) return null
  return (
    <div style={{
      position:'absolute',
      left: 960, top: 540,
      transform:'translate(-50%,-50%)',
      width: 6 + prog*40, height: 6 + prog*40,
      borderRadius:'50%',
      background:`radial-gradient(ellipse at center,
        rgba(255,255,255,${0.95*prog}) 0%,
        rgba(113,112,255,${0.60*prog}) 35%,
        transparent 70%)`,
      filter:`blur(${prog*8}px)`,
      opacity: op,
    }}/>
  )
}

// ─── ROOT COMPOSITION ─────────────────────────────────────────────────────────
export const SpectreSignal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // ── Layer flags
  const gridOp        = rampR(frame, T.GRID_IN) * 0.7
  const cornersOp     = rampR(frame, T.CORNERS_IN) * fadeR(frame, T.CORNERS_OUT)
  const waveOp        = rampR(frame, T.WAVE_IN) * fadeR(frame, [T.FRAG_START - 10, T.FRAG_START + 40])
  const waveLabelOp   = rampR(frame, T.LABEL_WAVE) * fadeR(frame, [T.FRAG_START, T.FRAG_START + 20])
  const colColorProg  = ramp(frame, T.FRAG_START, T.FRAG_END)   // amber→cyan in waveform
  const colsOp        = ramp(frame, T.FRAG_START - 10, T.FRAG_START + 10)
  const sortProg      = ramp(frame, T.SORT_START, T.SORT_END)
  const readoutOp     = rampR(frame, T.READOUT_IN) * fade(frame, T.COLLAPSE_START, T.COLLAPSE_END)
  const showParticles = frame >= T.COLLAPSE_START && frame < T.FLASH_OUT[1]
  const showMark      = frame >= T.CHARS_START
  const showURL       = frame >= T.URL_IN[0]
  const globalOp      = fadeR(frame, T.FADE)

  return (
    <AbsoluteFill style={{ opacity: globalOp }}>
      <Background/>
      <Grid opacity={gridOp}/>

      {/* Act I: Signal */}
      {waveOp > 0 && (
        <Waveform frame={frame} opacity={waveOp} colorProgress={colColorProg}/>
      )}
      {waveLabelOp > 0 && <WaveLabel opacity={waveLabelOp}/>}

      {/* Act II: Extraction */}
      {colsOp > 0 && (
        <FrequencyColumns
          frame={frame} fps={fps}
          opacity={colsOp}
          sortProgress={sortProg}
        />
      )}
      {readoutOp > 0 && <Readout frame={frame} opacity={readoutOp}/>}

      {/* Act III: Revelation */}
      {showParticles && <CollapseParticles frame={frame}/>}
      <ImplodePoint frame={frame}/>
      <Flash frame={frame}/>

      {showMark && (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
        }}>
          <Wordmark frame={frame} fps={fps}/>
          <Divider frame={frame}/>
          <Tagline frame={frame}/>
        </div>
      )}

      {showURL && <URLBadge frame={frame} fps={fps}/>}

      {/* Always-on */}
      <Corners opacity={cornersOp}/>
      <Vignette/>
      <Grain/>
      <Bars/>
    </AbsoluteFill>
  )
}
