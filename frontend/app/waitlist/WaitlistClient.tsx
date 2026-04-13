'use client'

import { useEffect, useRef, useState } from 'react'

// ── PARTICLE LAYERS ──────────────────────────────────────────────────────────
const DUST: [number, number, number, number, number][] = [
  [3,1,9,0,0.18],[11,1,7,3,0.22],[19,1,11,1,0.15],[27,1,8,5,0.20],
  [35,1,10,2,0.18],[43,1,7,7,0.24],[51,1,9,4,0.16],[59,1,11,1,0.21],
  [67,1,8,6,0.18],[75,1,10,3,0.20],[83,1,7,8,0.15],[91,1,9,0,0.22],
  [7,1,10,2,0.17],[23,1,8,9,0.19],[39,1,11,4,0.16],[55,1,7,6,0.23],
  [71,1,9,1,0.18],[87,1,10,7,0.21],[14,1,8,3,0.20],[46,1,7,5,0.16],
]
const ORBS: [number, number, number, number, number, number, number, number][] = [
  [8,  2.5,14,0, 113,112,255,0.55],[22,3,  11,5, 94,106,210,0.50],
  [36, 2.5,16,2, 113,112,255,0.48],[50,3,  13,8, 130,143,255,0.55],
  [64, 2.5,12,3, 94,106,210,0.45], [78,3,  15,7, 113,112,255,0.58],
  [92, 2.5,10,1, 130,143,255,0.50],[15,3,  17,4, 113,112,255,0.45],
  [45, 2.5,12,9, 94,106,210,0.52], [72,3,  14,6, 113,112,255,0.48],
  [30, 2.5,13,2, 130,143,255,0.42],[85,3,  11,5, 113,112,255,0.55],
]
const HALOS: [number, number, number, number, number][] = [
  [18,8,22,0,0.18],[42,6,28,9,0.14],[63,9,19,4,0.16],[82,7,25,14,0.12],
]

type FormState = 'idle' | 'loading' | 'success' | 'error'

// Split headline into word spans for staggered word reveal
function WordReveal({ text, baseDelay, className }: { text: string; baseDelay: number; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className} style={{ display: 'block' }}>
      {words.map((word, i) => (
        <span
          key={i}
          className="wl-word"
          style={{ '--wd' : `${baseDelay + i * 55}ms` } as React.CSSProperties}
        >
          {word}{i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  )
}

// ── WISP CONFIG ──────────────────────────────────────────────────────────────
const WISPS = [
  { x: 0.12, y: 0.82, len: 180, phase: 0.0,  hue: '113,112,255' },
  { x: 0.88, y: 0.75, len: 155, phase: 1.3,  hue: '130,143,255' },
  { x: 0.28, y: 0.90, len: 200, phase: 2.5,  hue: '94,106,210'  },
  { x: 0.72, y: 0.85, len: 165, phase: 0.7,  hue: '113,112,255' },
  { x: 0.50, y: 0.95, len: 145, phase: 3.2,  hue: '160,170,255' },
  { x: 0.04, y: 0.60, len: 170, phase: 1.9,  hue: '130,143,255' },
  { x: 0.96, y: 0.55, len: 190, phase: 2.8,  hue: '113,112,255' },
  { x: 0.40, y: 0.88, len: 158, phase: 0.4,  hue: '94,106,210'  },
]

export default function WaitlistClient() {
  const [email, setEmail]         = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [focused, setFocused]     = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: -2000, y: -2000 })

  // ── Wisp canvas animation ──────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const g = el.getContext('2d')
    if (!g) return

    // Capture as explicit non-nullable types so TS doesn't lose narrowing in closures
    const cvs: HTMLCanvasElement = el
    const ctx: CanvasRenderingContext2D = g

    let raf: number
    let t = 0

    const resize = () => {
      cvs.width  = window.innerWidth
      cvs.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    const onLeave = () => { mouseRef.current = { x: -2000, y: -2000 } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    function drawWisp(wx: number, wy: number, len: number, phase: number, hue: string, mx: number, my: number, time: number) {
      const dx   = mx - wx
      const dy   = my - wy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const pull = Math.max(0, 1 - dist / 380)

      for (let pass = 0; pass < 2; pass++) {
        const alpha = pass === 0 ? 0.055 + pull * 0.22 : 0.025 + pull * 0.09
        const lw    = pass === 0 ? 0.9  + pull * 2.0   : 4.0   + pull * 8.0

        ctx.beginPath()
        let px = wx, py = wy
        ctx.moveTo(px, py)

        for (let s = 1; s <= 10; s++) {
          const f     = s / 10
          const wave  = Math.sin(time * 0.55 + phase + s * 0.65) * 22 * f
          const wave2 = Math.cos(time * 0.42 + phase * 1.4 + s * 0.45) * 13 * f
          const nx    = wx + wave + dx * pull * 0.55 * f
          const ny    = wy - len * f + wave2 + dy * pull * 0.30 * f
          ctx.quadraticCurveTo((px + nx) / 2 + wave * 0.4, (py + ny) / 2, nx, ny)
          px = nx; py = ny
        }

        const tipX = wx + Math.sin(time * 0.55 + phase) * 22 + dx * pull * 0.55
        const tipY = wy - len + dy * pull * 0.30
        const grad = ctx.createLinearGradient(wx, wy, tipX, tipY)
        grad.addColorStop(0,    `rgba(${hue},${alpha})`)
        grad.addColorStop(0.55, `rgba(${hue},${alpha * 0.5})`)
        grad.addColorStop(1,    `rgba(${hue},0)`)

        ctx.strokeStyle = grad
        ctx.lineWidth   = lw
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.stroke()
      }
    }

    function loop() {
      t += 0.014
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      const { x: mx, y: my } = mouseRef.current
      WISPS.forEach(w => drawWisp(w.x * cvs.width, w.y * cvs.height, w.len, w.phase, w.hue, mx, my, t))
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  useEffect(() => {
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
          --wl-spring:   cubic-bezier(0.16, 1, 0.3, 1);
          --wl-snap:     cubic-bezier(0.25, 1, 0.5, 1);
          --wl-ease-out: cubic-bezier(0.0,  0, 0.2, 1);
        }

        /* ════════════════════════════════════════════════
           BACKGROUND — 7 LAYERS
        ════════════════════════════════════════════════ */
        .wl-page {
          min-height: calc(100dvh - 72px);
          display: flex; align-items: center; justify-content: center;
          padding: 40px 24px 80px;
          position: relative; overflow: hidden;
          background: radial-gradient(ellipse 180% 100% at 50% -20%,
            #0d0e18 0%, #07080f 40%, #010102 100%);
        }

        .wl-aurora {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(94,106,210,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 80% 70%, rgba(113,112,255,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 50% 0%,  rgba(130,143,255,0.18) 0%, transparent 55%);
          animation: wl-aurora-breathe 12s ease-in-out infinite alternate;
        }
        @keyframes wl-aurora-breathe {
          0%   { opacity: 0.6; transform: scale(1)    rotate(0deg); }
          50%  { opacity: 1.0; transform: scale(1.05) rotate(0.6deg); }
          100% { opacity: 0.8; transform: scale(1.02) rotate(-0.3deg); }
        }

        .wl-grid {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: repeating-linear-gradient(to right,
            transparent 0,
            transparent calc(100% / 12 - 1px),
            rgba(255,255,255,0.016) calc(100% / 12 - 1px),
            rgba(255,255,255,0.016) calc(100% / 12));
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 70%);
          /* grid fades in with page */
          opacity: 0;
          animation: wl-grid-in 2.2s var(--wl-ease-out) 300ms forwards;
        }
        @keyframes wl-grid-in {
          to { opacity: 1; }
        }

        .wl-bands {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: repeating-linear-gradient(180deg,
            transparent 0px, transparent 3px,
            rgba(255,255,255,0.004) 3px, rgba(255,255,255,0.004) 4px);
          opacity: 0.6;
        }
        .wl-noise {
          position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 96px 96px;
        }
        .wl-vignette {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse 110% 90% at 50% 50%, transparent 45%, rgba(1,1,2,0.55) 100%);
        }
        .wl-floor {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 280px; pointer-events: none; z-index: 0;
          background: linear-gradient(0deg, rgba(1,1,2,0.8) 0%, transparent 100%);
        }

        /* ════════════════════════════════════════════════
           PARTICLES
        ════════════════════════════════════════════════ */
        .wl-particles {
          position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden;
          /* particles fade in over 3s so they don't pop in at load */
          opacity: 0;
          animation: wl-particles-in 3s ease 800ms forwards;
        }
        @keyframes wl-particles-in { to { opacity: 1; } }

        @keyframes wl-rise-dust {
          0%   { transform: translateY(0)    translateX(0px);  opacity: var(--op); }
          45%  { transform: translateY(-45vh) translateX(3px); opacity: calc(var(--op) * 0.7); }
          100% { transform: translateY(-105vh) translateX(-2px); opacity: 0; }
        }
        @keyframes wl-rise-orb {
          0%   { transform: translateY(0)    scale(1);    opacity: var(--op); }
          60%  { transform: translateY(-65vh) scale(0.8); opacity: calc(var(--op) * 0.5); }
          100% { transform: translateY(-108vh) scale(0.4); opacity: 0; }
        }
        @keyframes wl-rise-halo {
          0%   { transform: translateY(0)    scale(1);    opacity: var(--op); }
          50%  { transform: translateY(-50vh) scale(1.2); opacity: calc(var(--op) * 0.6); }
          100% { transform: translateY(-105vh) scale(0.6); opacity: 0; }
        }

        /* ════════════════════════════════════════════════
           PAGE-LOAD REVEAL SYSTEM
           Each element animates in individually with
           spring easing + blur dissolve + lift.
        ════════════════════════════════════════════════ */

        /* Shared reveal base */
        .wl-reveal {
          opacity: 0;
          animation: wl-reveal-in 0.9s var(--wl-spring) var(--rd, 0ms) forwards;
        }
        @keyframes wl-reveal-in {
          0%   { opacity: 0; transform: translateY(22px) scale(0.97); filter: blur(6px); }
          60%  { filter: blur(0px); }
          100% { opacity: 1; transform: translateY(0)   scale(1);    filter: blur(0px); }
        }

        /* Per-word staggered reveal for headline */
        .wl-word {
          display: inline-block;
          opacity: 0;
          animation: wl-word-in 0.75s var(--wl-spring) var(--wd, 0ms) forwards;
        }
        @keyframes wl-word-in {
          0%   { opacity: 0; transform: translateY(28px) rotateX(12deg); filter: blur(8px); }
          55%  { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0)    rotateX(0deg);  filter: blur(0); }
        }

        /* Eyebrow chips slide in from left with stagger */
        .wl-badge-wrap {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 10px; margin-bottom: 40px;
          opacity: 0;
          animation: wl-badges-in 0.7s var(--wl-spring) 60ms forwards;
        }
        @keyframes wl-badges-in {
          0%   { opacity: 0; transform: translateY(12px) scale(0.94); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
        }

        /* Divider draws itself */
        .wl-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(113,112,255,0.5), rgba(255,255,255,0.2), rgba(113,112,255,0.5), transparent);
          margin: 0 auto 28px;
          transform-origin: center;
          opacity: 0;
          animation: wl-divider-in 0.6s var(--wl-snap) 520ms forwards;
        }
        @keyframes wl-divider-in {
          0%   { opacity: 0; transform: scaleX(0); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: scaleX(1); }
        }

        /* Scan line sweeps across headline once on load */
        .wl-h1-scan {
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(113,112,255,0.4) 20%,
            rgba(255,255,255,0.65) 50%, rgba(113,112,255,0.4) 80%, transparent 100%);
          opacity: 0;
          animation: wl-scan 1.4s var(--wl-ease-out) 380ms forwards;
          pointer-events: none;
        }
        @keyframes wl-scan {
          0%   { top: 0%;   opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }

        /* Card slides up from 40px with scale */
        .wl-card-wrap {
          position: relative;
          opacity: 0;
          animation: wl-card-in 1.0s var(--wl-spring) 680ms forwards;
        }
        @keyframes wl-card-in {
          0%   { opacity: 0; transform: translateY(40px) scale(0.96); filter: blur(8px); }
          55%  { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
        }

        /* Social strip: each item staggers in */
        .wl-strip {
          display: flex; align-items: center; justify-content: center;
          flex-wrap: wrap; gap: 16px; margin-top: 32px;
        }
        .wl-strip-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: var(--subdued); letter-spacing: 0.02em;
          opacity: 0;
          animation: wl-reveal-in 0.7s var(--wl-spring) var(--rd, 0ms) forwards;
        }
        .wl-strip-sep {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(255,255,255,0.12);
          opacity: 0;
          animation: wl-reveal-in 0.7s var(--wl-spring) var(--rd, 0ms) forwards;
        }
        .wl-strip-icon {
          width: 14px; height: 14px; opacity: 0.35; flex-shrink: 0;
        }

        /* ════════════════════════════════════════════════
           EYEBROW
        ════════════════════════════════════════════════ */
        .wl-live-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 12px 5px 10px;
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.18);
          border-radius: 99px;
          font-size: 11px; font-weight: 500;
          color: rgba(16,185,129,0.9); letter-spacing: 0.04em; text-transform: uppercase;
        }
        .wl-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px rgba(16,185,129,0.8);
          animation: wl-live-pulse 2s ease-in-out infinite;
        }
        @keyframes wl-live-pulse {
          0%, 100% { opacity: 1;   transform: scale(1);   box-shadow: 0 0 6px rgba(16,185,129,0.8); }
          50%       { opacity: 0.6; transform: scale(0.8); box-shadow: 0 0 3px rgba(16,185,129,0.4); }
        }

        /* ════════════════════════════════════════════════
           HEADLINE
        ════════════════════════════════════════════════ */
        .wl-h1 {
          font-size: clamp(44px, 7vw, 80px);
          font-weight: 510; line-height: 1.0; letter-spacing: -0.04em;
          margin-bottom: 28px;
          perspective: 600px;
        }
        .wl-h1-line1 {
          display: block; color: #f7f8f8;
          text-shadow:
            -1px 0px 0 rgba(255,50,120,0.11),
             1px 0px 0 rgba(0,210,255,0.11),
             0 0 80px rgba(113,112,255,0.22),
             0 0 120px rgba(113,112,255,0.08);
        }
        .wl-h1-line2 {
          display: block;
          color: rgba(190,198,255,0.82);
          filter: drop-shadow(0 0 32px rgba(113,112,255,0.35));
        }
        .wl-h1-wrap { position: relative; display: inline-block; width: 100%; }

        /* ════════════════════════════════════════════════
           SUBHEADLINE
        ════════════════════════════════════════════════ */
        .wl-sub {
          font-size: 17px; color: var(--text-2);
          line-height: 1.65; letter-spacing: -0.01em; font-weight: 400;
          margin: 0 auto 44px;
        }
        .wl-sub strong { color: rgba(200,205,255,0.8); font-weight: 500; }

        /* ════════════════════════════════════════════════
           GLASS CARD
        ════════════════════════════════════════════════ */
        .wl-card-bloom {
          position: absolute; inset: -24px;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(113,112,255,0.08) 0%, transparent 70%);
          pointer-events: none; transition: opacity 0.4s ease; opacity: 0;
        }
        .wl-card-wrap.focused .wl-card-bloom { opacity: 1; }

        .wl-card {
          position: relative; width: 100%; padding: 26px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(10,11,14,0.75);
          backdrop-filter: blur(32px) saturate(1.4);
          -webkit-backdrop-filter: blur(32px) saturate(1.4);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.5),
            0 8px 24px rgba(0,0,0,0.4),
            0 32px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.06),
            inset 0 -1px 0 rgba(0,0,0,0.3);
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
          overflow: hidden;
        }
        .wl-card-wrap.focused .wl-card {
          border-color: rgba(113,112,255,0.20);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.5),
            0 8px 24px rgba(0,0,0,0.4),
            0 32px 80px rgba(0,0,0,0.55),
            0 0 80px rgba(113,112,255,0.10),
            inset 0 1px 0 rgba(113,112,255,0.10),
            inset 0 -1px 0 rgba(0,0,0,0.3);
        }
        .wl-card::before {
          content: '';
          position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(113,112,255,0.5), rgba(200,210,255,0.6), rgba(113,112,255,0.5), transparent);
          opacity: 0; transition: opacity 0.35s ease;
        }
        .wl-card-wrap.focused .wl-card::before { opacity: 1; }
        .wl-card::after {
          content: ''; position: absolute; top: 0; left: 0; width: 60%; height: 40%;
          background: radial-gradient(ellipse 120% 120% at 0% 0%, rgba(255,255,255,0.025) 0%, transparent 60%);
          pointer-events: none;
        }

        .wl-card-scan {
          position: absolute; top: -2px; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(113,112,255,0.6) 30%, rgba(200,210,255,0.8) 50%, rgba(113,112,255,0.6) 70%, transparent 100%);
          opacity: 0; pointer-events: none;
        }
        .wl-card-wrap.focused .wl-card-scan {
          animation: wl-card-scan-drop 0.7s var(--wl-ease-out) forwards;
        }
        @keyframes wl-card-scan-drop {
          0%  { top: -2px; opacity: 0; } 10% { opacity: 1; } 100% { top: 100%; opacity: 0; }
        }

        /* ════════════════════════════════════════════════
           INPUT
        ════════════════════════════════════════════════ */
        .wl-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 11px; color: var(--text); font-size: 15px; font-family: inherit;
          outline: none;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s var(--wl-snap);
          margin-bottom: 10px;
        }
        .wl-input::placeholder { color: var(--subdued); }
        .wl-input:focus {
          background: rgba(113,112,255,0.04); border-color: rgba(113,112,255,0.40);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 1px rgba(113,112,255,0.40), 0 0 0 4px rgba(113,112,255,0.10), 0 0 32px rgba(113,112,255,0.10);
          transform: translateY(-1px) scale(1.004);
        }

        /* ════════════════════════════════════════════════
           BUTTON
        ════════════════════════════════════════════════ */
        .wl-btn {
          position: relative; overflow: hidden; width: 100%; padding: 14px;
          background: linear-gradient(180deg, rgba(130,143,255,1) 0%, rgba(94,106,210,1) 100%);
          border: 1px solid rgba(160,170,255,0.25); border-radius: 11px;
          color: #fff; font-size: 15px; font-weight: 520; font-family: inherit;
          letter-spacing: 0.005em; cursor: pointer;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.15) inset,
            0 -1px 0 rgba(0,0,0,0.20) inset,
            0 0 40px rgba(113,112,255,0.30),
            0 8px 28px rgba(94,106,210,0.30);
          transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s var(--wl-snap), border-color 0.2s ease;
        }
        .wl-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, rgba(155,165,255,1) 0%, rgba(113,125,230,1) 100%);
          box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.20) inset, 0 0 60px rgba(113,112,255,0.50), 0 12px 36px rgba(94,106,210,0.45);
          transform: translateY(-1.5px); border-color: rgba(180,190,255,0.30);
        }
        .wl-btn:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.978);
          box-shadow: 0 0 0 rgba(255,255,255,0.12) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 0 20px rgba(113,112,255,0.20), 0 4px 12px rgba(94,106,210,0.25);
        }
        .wl-btn:disabled { opacity: 0.50; cursor: not-allowed; }
        .wl-btn::before {
          content: ''; position: absolute; top: 0; left: -120%; width: 55%; height: 100%;
          background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 60%, transparent 100%);
          transform: skewX(-15deg); transition: none; pointer-events: none;
        }
        .wl-btn:hover:not(:disabled)::before { animation: wl-shine 0.55s ease forwards; }
        @keyframes wl-shine { from { left: -120%; } to { left: 140%; } }

        .wl-founding {
          font-size: 12px; color: var(--subdued); margin-top: 16px; letter-spacing: 0.01em;
        }
        .wl-founding span { color: rgba(113,112,255,0.7); }

        /* ════════════════════════════════════════════════
           SUCCESS STATE
        ════════════════════════════════════════════════ */
        .wl-success-wrap {
          padding: 8px 0 4px;
          animation: wl-reveal-in 0.5s var(--wl-spring) forwards;
        }
        .wl-success-icon {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px; font-size: 18px;
          animation: wl-success-pop 0.4s var(--wl-spring) 0.1s both;
        }
        @keyframes wl-success-pop {
          0%  { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100%{ transform: scale(1);   opacity: 1; }
        }
        .wl-success-text { font-size: 16px; color: var(--text-2); line-height: 1.6; }
        .wl-success-text strong { display: block; color: var(--text); font-size: 17px; margin-bottom: 4px; }

        .wl-error {
          font-size: 12px; color: var(--error); margin-top: 10px;
          opacity: 0; animation: wl-reveal-in 0.4s var(--wl-spring) forwards;
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

        {/* 3-tier particle system */}
        <div className="wl-particles" aria-hidden="true">
          {DUST.map(([left, size, dur, negDelay, op], i) => (
            <div key={`d${i}`} style={{
              position:'absolute', bottom:'-4px', left:`${left}%`,
              width:`${size}px`, height:`${size}px`, borderRadius:'50%',
              background:`rgba(255,255,255,${op})`,
              animation:`wl-rise-dust ${dur}s linear -${negDelay}s infinite`,
              ['--op' as string]: op,
            }} />
          ))}
          {ORBS.map(([left, size, dur, negDelay, r, g, b, op], i) => (
            <div key={`o${i}`} style={{
              position:'absolute', bottom:'-6px', left:`${left}%`,
              width:`${size}px`, height:`${size}px`, borderRadius:'50%',
              background:`rgba(${r},${g},${b},${op})`, filter:'blur(0.6px)',
              animation:`wl-rise-orb ${dur}s linear -${negDelay}s infinite`,
              ['--op' as string]: op,
            }} />
          ))}
          {HALOS.map(([left, size, dur, negDelay, op], i) => (
            <div key={`h${i}`} style={{
              position:'absolute', bottom:'-16px', left:`${left}%`,
              width:`${size}px`, height:`${size}px`, borderRadius:'50%',
              background:`rgba(113,112,255,${op})`, filter:'blur(3px)',
              animation:`wl-rise-halo ${dur}s linear -${negDelay}s infinite`,
              ['--op' as string]: op,
            }} />
          ))}
        </div>

        {/* Wisp canvas — mouse-reactive tendrils */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            zIndex: 2, opacity: 0,
            animation: 'wl-particles-in 3s ease 1200ms forwards',
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div style={{
          position:'relative', zIndex:3,
          width:'min(580px, calc(100vw - 48px))',
          textAlign:'center',
        }}>
          {/* Eyebrow */}
          <div className="wl-badge-wrap">
            <span className="wl-live-badge">
              <span className="wl-live-dot" />
              Accepting applications
            </span>
            <span className="metric-chip">Free for founding members</span>
          </div>

          {/* Headline — per-word staggered reveal */}
          <div className="wl-h1-wrap">
            <h1 className="wl-h1">
              <WordReveal text="See an app." baseDelay={180} className="wl-h1-line1" />
              <WordReveal text="Ship an app." baseDelay={320} className="wl-h1-line2" />
            </h1>
            <div className="wl-h1-scan" aria-hidden="true" />
          </div>

          {/* Divider */}
          <div className="wl-divider" />

          {/* Sub */}
          <p className="wl-sub wl-reveal" style={{'--rd':'520ms'} as React.CSSProperties}>
            Record any app. Get a UI blueprint inspired by it —<br />
            ready for your <strong>agent to design</strong>.
          </p>

          {/* Card */}
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
                    ref={inputRef} className="wl-input" type="email"
                    placeholder="your@email.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    required disabled={formState === 'loading'}
                  />
                  <button className="wl-btn" type="submit" disabled={formState === 'loading'}>
                    {formState === 'loading' ? 'Sending...' : 'Get my free blueprint'}
                  </button>
                  {formState === 'error' && <p className="wl-error">Something went wrong — try again.</p>}
                </form>
              )}

              <p className="wl-founding">
                Founding members get a <span>lifetime discount</span> at launch.
              </p>
            </div>
          </div>

          {/* Social proof strip */}
          <div className="wl-strip">
            {[
              { icon: <svg className="wl-strip-icon" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Expo + React Native', delay: 920 },
              null,
              { icon: <svg className="wl-strip-icon" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5h6M4 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, label: 'Every screen & component', delay: 1020 },
              null,
              { icon: <svg className="wl-strip-icon" viewBox="0 0 14 14" fill="none"><path d="M2 7c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 5v2l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, label: 'Any AI agent', delay: 1120 },
            ].map((item, i) =>
              item === null
                ? <span key={i} className="wl-strip-sep" style={{'--rd': `${980 + i * 50}ms`} as React.CSSProperties} />
                : <span key={i} className="wl-strip-item" style={{'--rd': `${item.delay}ms`} as React.CSSProperties}>
                    {item.icon}{item.label}
                  </span>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
