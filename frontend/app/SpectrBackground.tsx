'use client'

import { useEffect, useRef } from 'react'

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

const WISP_HUES = ['113,112,255','130,143,255','94,106,210','160,170,255','180,192,255']
const WISP_COUNT = 9
const TRAIL_LEN  = 90

type FlyWisp = {
  x: number; y: number; vx: number; vy: number; curve: number
  trail: { x: number; y: number }[]
  hue: string; alpha: number; width: number; life: number; maxLife: number
}

function spawnWisp(cw: number, ch: number, mid = false): FlyWisp {
  const edge  = Math.floor(Math.random() * 4)
  let x = 0, y = 0, angle = 0
  switch (edge) {
    case 0: x = Math.random() * cw; y = -20;    angle = Math.PI * 0.3  + Math.random() * Math.PI * 0.4; break
    case 1: x = cw + 20;            y = Math.random() * ch; angle = Math.PI + (Math.random() - 0.5) * 0.8; break
    case 2: x = Math.random() * cw; y = ch + 20; angle = -Math.PI * 0.3 - Math.random() * Math.PI * 0.4; break
    default: x = -20; y = Math.random() * ch;    angle = (Math.random() - 0.5) * 0.8; break
  }
  const speed = 0.45 + Math.random() * 1.1
  const w: FlyWisp = {
    x: mid ? Math.random() * cw : x,
    y: mid ? Math.random() * ch : y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    curve: (Math.random() - 0.5) * 0.005,
    trail: [],
    hue:   WISP_HUES[Math.floor(Math.random() * WISP_HUES.length)],
    alpha: 0.14 + Math.random() * 0.24,
    width: 1.2  + Math.random() * 2.8,
    life:  0,
    maxLife: 420 + Math.random() * 480,
  }
  if (mid) w.life = Math.random() * w.maxLife * 0.6
  return w
}

const SPECTR_BG_CSS = `
        .sb-aurora {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(94,106,210,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 80% 70%, rgba(113,112,255,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 50% 0%,  rgba(130,143,255,0.18) 0%, transparent 55%);
          animation: sb-aurora-breathe 12s ease-in-out infinite alternate;
        }
        @keyframes sb-aurora-breathe {
          0%   { opacity: 0.6; transform: scale(1)    rotate(0deg); }
          50%  { opacity: 1.0; transform: scale(1.05) rotate(0.6deg); }
          100% { opacity: 0.8; transform: scale(1.02) rotate(-0.3deg); }
        }
        .sb-grid {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: repeating-linear-gradient(to right,
            transparent 0,
            transparent calc(100% / 12 - 1px),
            rgba(255,255,255,0.016) calc(100% / 12 - 1px),
            rgba(255,255,255,0.016) calc(100% / 12));
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 70%);
          opacity: 0;
          animation: sb-grid-in 2.2s cubic-bezier(0,0,0.2,1) 300ms forwards;
        }
        @keyframes sb-grid-in { to { opacity: 1; } }
        .sb-bands {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: repeating-linear-gradient(180deg,
            transparent 0px, transparent 3px,
            rgba(255,255,255,0.004) 3px, rgba(255,255,255,0.004) 4px);
          opacity: 0.6;
        }
        .sb-noise {
          position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 96px 96px;
        }
        .sb-vignette {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse 110% 90% at 50% 50%, transparent 45%, rgba(1,1,2,0.55) 100%);
        }
        .sb-floor {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 280px; pointer-events: none; z-index: 0;
          background: linear-gradient(0deg, rgba(1,1,2,0.8) 0%, transparent 100%);
        }
        .sb-particles {
          position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden;
          opacity: 0;
          animation: sb-particles-in 3s ease 800ms forwards;
        }
        @keyframes sb-particles-in { to { opacity: 1; } }
        @keyframes sb-rise-dust {
          0%   { transform: translateY(0)    translateX(0px);  opacity: var(--op); }
          45%  { transform: translateY(-45vh) translateX(3px); opacity: calc(var(--op) * 0.7); }
          100% { transform: translateY(-105vh) translateX(-2px); opacity: 0; }
        }
        @keyframes sb-rise-orb {
          0%   { transform: translateY(0)    scale(1);    opacity: var(--op); }
          60%  { transform: translateY(-65vh) scale(0.8); opacity: calc(var(--op) * 0.5); }
          100% { transform: translateY(-108vh) scale(0.4); opacity: 0; }
        }
        @keyframes sb-rise-halo {
          0%   { transform: translateY(0)    scale(1);    opacity: var(--op); }
          50%  { transform: translateY(-50vh) scale(1.2); opacity: calc(var(--op) * 0.6); }
          100% { transform: translateY(-105vh) scale(0.6); opacity: 0; }
        }
      `

export default function SpectrBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const g  = el.getContext('2d')
    if (!g)  return
    const cvs: HTMLCanvasElement = el
    const ctx: CanvasRenderingContext2D = g
    let raf: number

    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const wisps: FlyWisp[] = Array.from({ length: WISP_COUNT }, (_, i) =>
      spawnWisp(cvs.width, cvs.height, i < 6)
    )

    function loop() {
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      const margin = 180

      wisps.forEach((w, i) => {
        w.life++
        const c = Math.cos(w.curve), s = Math.sin(w.curve)
        const nvx = w.vx * c - w.vy * s
        w.vy = w.vx * s + w.vy * c
        w.vx = nvx
        w.x += w.vx
        w.y += w.vy

        w.trail.push({ x: w.x, y: w.y })
        if (w.trail.length > TRAIL_LEN) w.trail.shift()

        if (w.life >= w.maxLife ||
            w.x < -margin || w.x > cvs.width  + margin ||
            w.y < -margin || w.y > cvs.height + margin) {
          wisps[i] = spawnWisp(cvs.width, cvs.height)
          return
        }

        if (w.trail.length < 3) return

        const lr = w.life / w.maxLife
        const la = lr < 0.12 ? lr / 0.12 : lr > 0.78 ? (1 - lr) / 0.22 : 1

        for (let t = 1; t < w.trail.length; t++) {
          const tRatio = t / w.trail.length
          const a = w.alpha * la * tRatio * tRatio
          ctx.beginPath()
          ctx.moveTo(w.trail[t - 1].x, w.trail[t - 1].y)
          ctx.lineTo(w.trail[t].x,     w.trail[t].y)
          ctx.strokeStyle = `rgba(${w.hue},${a})`
          ctx.lineWidth   = w.width * tRatio
          ctx.lineCap     = 'round'
          ctx.stroke()
        }

        const headA = w.alpha * la * 0.55
        const r = w.width * 5
        const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, r)
        grad.addColorStop(0,   `rgba(${w.hue},${headA})`)
        grad.addColorStop(0.5, `rgba(${w.hue},${headA * 0.35})`)
        grad.addColorStop(1,   `rgba(${w.hue},0)`)
        ctx.beginPath()
        ctx.arc(w.x, w.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SPECTR_BG_CSS }} />

      <div className="sb-aurora"   aria-hidden="true" />
      <div className="sb-grid"     aria-hidden="true" />
      <div className="sb-bands"    aria-hidden="true" />
      <div className="sb-noise"    aria-hidden="true" />
      <div className="sb-vignette" aria-hidden="true" />
      <div className="sb-floor"    aria-hidden="true" />

      <div className="sb-particles" aria-hidden="true">
        {DUST.map(([left, size, dur, negDelay, op], i) => (
          <div key={`d${i}`} style={{
            position:'absolute', bottom:'-4px', left:`${left}%`,
            width:`${size}px`, height:`${size}px`, borderRadius:'50%',
            background:`rgba(255,255,255,${op})`,
            animation:`sb-rise-dust ${dur}s linear -${negDelay}s infinite`,
            ['--op' as string]: op,
          }} />
        ))}
        {ORBS.map(([left, size, dur, negDelay, r, g, b, op], i) => (
          <div key={`o${i}`} style={{
            position:'absolute', bottom:'-6px', left:`${left}%`,
            width:`${size}px`, height:`${size}px`, borderRadius:'50%',
            background:`rgba(${r},${g},${b},${op})`, filter:'blur(0.6px)',
            animation:`sb-rise-orb ${dur}s linear -${negDelay}s infinite`,
            ['--op' as string]: op,
          }} />
        ))}
        {HALOS.map(([left, size, dur, negDelay, op], i) => (
          <div key={`h${i}`} style={{
            position:'absolute', bottom:'-16px', left:`${left}%`,
            width:`${size}px`, height:`${size}px`, borderRadius:'50%',
            background:`rgba(113,112,255,${op})`, filter:'blur(3px)',
            animation:`sb-rise-halo ${dur}s linear -${negDelay}s infinite`,
            ['--op' as string]: op,
          }} />
        ))}
      </div>

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          zIndex: 2, opacity: 0,
          animation: 'sb-particles-in 3s ease 1200ms forwards',
        }}
        aria-hidden="true"
      />
    </>
  )
}
