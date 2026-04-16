'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

type Screen = 'details' | 'choice' | 'sending' | 'submitted'
type UploadState = 'idle' | 'uploading' | 'done' | 'error'
type ChoiceBusy = null | 'paid' | 'free'

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

export default function HomeClient() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Flow state
  const [screen, setScreen] = useState<Screen>('details')

  // Upload + form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive,   setDragActive]   = useState(false)
  const [referenceApp, setReferenceApp] = useState('')
  const [yourAppName,  setYourAppName]  = useState('')
  const [email,        setEmail]        = useState('')

  const [uploadState,    setUploadState]    = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedKey,    setUploadedKey]    = useState('')
  const [fileError,      setFileError]      = useState<string | null>(null)

  const [choiceBusy,  setChoiceBusy]  = useState<ChoiceBusy>(null)
  const [choiceError, setChoiceError] = useState<string | null>(null)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const uploadDoneRef = useRef(false)
  const rafRef        = useRef<number>(0)

  // ── Flying wisp canvas ───────────────────────────────────────────────────
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

  // ── File validation ──────────────────────────────────────────────────────
  function validateFile(file: File): string | null {
    if (!file.name.toLowerCase().endsWith('.mp4') && file.type !== 'video/mp4') {
      return 'Only .mp4 files are accepted'
    }
    if (file.size > 500 * 1024 * 1024) {
      return 'File must be under 500 MB'
    }
    return null
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateFile(file)
    if (err) { setFileError(err); return }
    setSelectedFile(file)
    setFileError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const err = validateFile(file)
    if (err) { setFileError(err); return }
    setSelectedFile(file)
    setFileError(null)
  }

  // ── Step 1 → Step 2: upload file, then transition to choice screen ──────
  async function handleContinue() {
    if (!selectedFile || !referenceApp.trim() || uploadState === 'uploading') return
    setUploadState('uploading')
    setUploadProgress(0)
    uploadDoneRef.current = false

    const CEILING = 72
    const estimatedMs = Math.max(6000, (selectedFile.size / (2 * 1024 * 1024)) * 1000)
    const startTime = Date.now()
    let lastTick = 0

    function tick(now: number) {
      if (uploadDoneRef.current) return
      if (now - lastTick >= 80) {
        lastTick = now
        const elapsed = Date.now() - startTime
        const p = Math.min((elapsed / estimatedMs) * CEILING, CEILING)
        setUploadProgress(parseFloat(p.toFixed(1)))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    try {
      const res = await fetch('/api/waitlist/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile.name, size: selectedFile.size }),
      })
      if (!res.ok) {
        uploadDoneRef.current = true
        cancelAnimationFrame(rafRef.current)
        setUploadState('error')
        return
      }
      const { key, token } = await res.json()

      const { error: uploadErr } = await supabase.storage
        .from('waitlist-videos')
        .uploadToSignedUrl(key, token, selectedFile, { contentType: 'video/mp4' })

      uploadDoneRef.current = true
      cancelAnimationFrame(rafRef.current)

      if (uploadErr) { setUploadState('error'); return }

      setUploadProgress(100)
      setUploadState('done')
      setUploadedKey(key)
      await new Promise(r => setTimeout(r, 450))

      setScreen('choice')
    } catch {
      uploadDoneRef.current = true
      cancelAnimationFrame(rafRef.current)
      setUploadState('error')
    }
  }

  // ── Paid CTA: create project, kick off Stripe Checkout ──────────────────
  async function handlePaid(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || choiceBusy) return
    setChoiceBusy('paid')
    setChoiceError(null)
    try {
      const res = await fetch('/api/projects/anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auto',
          email: email.trim().toLowerCase(),
          video_s3_key: uploadedKey,
          video_filename: selectedFile?.name ?? null,
          reference_app: referenceApp.trim(),
          your_app_name: yourAppName.trim() || referenceApp.trim(),
        }),
      })
      if (!res.ok) {
        setChoiceError('Something went wrong — try again.')
        setChoiceBusy(null)
        return
      }
      const { checkoutUrl } = await res.json()
      if (!checkoutUrl) {
        setChoiceError('Checkout unavailable right now — try the free demo.')
        setChoiceBusy(null)
        return
      }
      window.location.href = checkoutUrl
    } catch {
      setChoiceError('Network error — try again.')
      setChoiceBusy(null)
    }
  }

  // ── Free demo CTA: create project + waitlist row, notify founder ────────
  async function handleFree(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || choiceBusy) return
    setChoiceBusy('free')
    setChoiceError(null)
    setScreen('sending')
    try {
      const res = await fetch('/api/projects/anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'sample',
          email: email.trim().toLowerCase(),
          video_s3_key: uploadedKey,
          video_filename: selectedFile?.name ?? null,
          reference_app: referenceApp.trim(),
          your_app_name: yourAppName.trim() || referenceApp.trim(),
        }),
      })
      if (!res.ok) {
        setChoiceError('Something went wrong — try again.')
        setChoiceBusy(null)
        setScreen('choice')
        return
      }
      const { projectId, accessToken } = await res.json()
      if (projectId && accessToken) {
        router.push(`/p/${projectId}?t=${encodeURIComponent(accessToken)}`)
        return
      }
      setScreen('submitted')
    } catch {
      setChoiceError('Network error — try again.')
      setChoiceBusy(null)
      setScreen('choice')
    }
  }

  const canContinue = !!selectedFile && referenceApp.trim().length > 0 && uploadState !== 'uploading'

  return (
    <>
      <style>{`
        :root {
          --wl-spring:   cubic-bezier(0.16, 1, 0.3, 1);
          --wl-snap:     cubic-bezier(0.25, 1, 0.5, 1);
          --wl-ease-out: cubic-bezier(0.0,  0, 0.2, 1);
        }
        .wl-page {
          min-height: calc(100dvh - 72px);
          display: flex; align-items: center; justify-content: center;
          padding: 8px 24px 16px;
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
          opacity: 0;
          animation: wl-grid-in 2.2s var(--wl-ease-out) 300ms forwards;
        }
        @keyframes wl-grid-in { to { opacity: 1; } }
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
        .wl-particles {
          position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden;
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
        .wl-reveal {
          opacity: 0;
          animation: wl-reveal-in 0.9s var(--wl-spring) var(--rd, 0ms) forwards;
        }
        @keyframes wl-reveal-in {
          0%   { opacity: 0; transform: translateY(22px) scale(0.97); filter: blur(6px); }
          60%  { filter: blur(0px); }
          100% { opacity: 1; transform: translateY(0)   scale(1);    filter: blur(0px); }
        }
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
        .wl-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(113,112,255,0.5), rgba(255,255,255,0.2), rgba(113,112,255,0.5), transparent);
          margin: 0 auto 14px;
          transform-origin: center;
          opacity: 0;
          animation: wl-divider-in 0.6s var(--wl-snap) 520ms forwards;
        }
        @keyframes wl-divider-in {
          0%   { opacity: 0; transform: scaleX(0); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: scaleX(1); }
        }
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
        .wl-neon-mark {
          font-size: clamp(30px, 5vw, 60px);
          font-weight: 200;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 14px;
          text-indent: 0.22em;
          text-shadow:
            0 0 4px rgba(255,255,255,1),
            0 0 10px rgba(255,255,255,0.9),
            0 0 22px rgba(255,255,255,0.6),
            0 0 45px rgba(200,212,255,0.55),
            0 0 85px rgba(160,180,255,0.35),
            0 0 130px rgba(130,150,255,0.20);
          opacity: 0;
          animation:
            wl-reveal-in 0.9s var(--wl-spring) 0ms forwards,
            wl-neon-breathe 4.5s 0.95s ease-in-out infinite;
        }
        @keyframes wl-neon-breathe {
          0%, 100% {
            text-shadow:
              0 0 4px rgba(255,255,255,1),
              0 0 10px rgba(255,255,255,0.9),
              0 0 22px rgba(255,255,255,0.6),
              0 0 45px rgba(200,212,255,0.55),
              0 0 85px rgba(160,180,255,0.35),
              0 0 130px rgba(130,150,255,0.20);
          }
          50% {
            text-shadow:
              0 0 4px rgba(255,255,255,1),
              0 0 12px rgba(255,255,255,1),
              0 0 28px rgba(255,255,255,0.75),
              0 0 60px rgba(210,220,255,0.70),
              0 0 110px rgba(170,188,255,0.48),
              0 0 170px rgba(140,160,255,0.28);
          }
        }
        .wl-h1 {
          font-size: clamp(34px, 4.8vw, 58px);
          font-weight: 510; line-height: 1.0; letter-spacing: -0.04em;
          margin-bottom: 6px;
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
          animation: wl-tagline-glow 3.2s ease-in-out infinite;
        }
        @keyframes wl-tagline-glow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(113,112,255,0.22))
                    drop-shadow(0 0 24px rgba(113,112,255,0.10));
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(130,143,255,0.55))
                    drop-shadow(0 0 48px rgba(113,112,255,0.28))
                    drop-shadow(0 0 80px rgba(113,112,255,0.10));
          }
        }
        .wl-h1-wrap { position: relative; display: inline-block; width: 100%; }
        .wl-sub {
          font-size: 15px; color: var(--text-2);
          line-height: 1.55; letter-spacing: -0.01em; font-weight: 400;
          margin: 0 auto 10px;
        }
        .wl-sub strong { color: rgba(200,205,255,0.8); font-weight: 500; }

        .wl-demo-side {
          position: fixed;
          top: calc(44% - 6px);
          right: max(80px, 8vw);
          transform: translateY(-50%);
          z-index: 3;
          pointer-events: auto;
          max-height: calc(100dvh - 64px);
        }
        .wl-demo-inner {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px;
        }
        .wl-demo-slide-up {
          opacity: 0;
          animation: wl-demo-slide-up 1.1s var(--wl-spring) var(--rd, 0ms) forwards;
        }
        @keyframes wl-demo-slide-up {
          0%   { opacity: 0; transform: translateY(100vh); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .wl-demo-frame {
          position: relative;
          width: min(186px, calc((100dvh - 120px) * 0.462));
          aspect-ratio: 1180 / 2556;
          border-radius: 28px;
          padding: 5px;
          background: linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, rgba(113,112,255,0.10) 100%);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.5),
            0 14px 36px rgba(0,0,0,0.45),
            0 32px 80px rgba(0,0,0,0.55),
            0 0 56px rgba(113,112,255,0.10),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .wl-demo-glow {
          position: absolute; inset: -22px;
          background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(113,112,255,0.16) 0%, transparent 70%);
          pointer-events: none;
          animation: wl-demo-breathe 5s ease-in-out infinite;
        }
        @keyframes wl-demo-breathe {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        .wl-demo-video {
          position: relative; z-index: 1;
          width: 100%; height: 100%;
          display: block;
          border-radius: 26px;
          object-fit: cover;
          background: #0a0b0e;
        }
        @media (max-width: 1180px) {
          .wl-demo-side { right: max(20px, 2.5vw); }
          .wl-demo-frame { width: min(158px, calc((100dvh - 120px) * 0.462)); border-radius: 24px; }
          .wl-demo-video { border-radius: 20px; }
        }
        @media (max-width: 960px) {
          .wl-demo-side { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wl-demo-glow { animation: none; }
          .wl-demo-slide-up { animation-duration: 0.01s; }
        }

        .wl-card {
          position: relative; width: 100%; padding: 14px; border-radius: 20px;
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
          overflow: hidden;
        }
        .wl-card::after {
          content: ''; position: absolute; top: 0; left: 0; width: 60%; height: 40%;
          background: radial-gradient(ellipse 120% 120% at 0% 0%, rgba(255,255,255,0.025) 0%, transparent 60%);
          pointer-events: none;
        }

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
        .wl-btn:disabled { opacity: 0.50; cursor: not-allowed; }

        .wl-btn-ghost {
          width: 100%; padding: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 11px;
          color: #e0e4ff; font-size: 14px; font-weight: 500; font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s var(--wl-snap);
        }
        .wl-btn-ghost:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.22);
        }
        .wl-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

        .wl-upload-zone {
          border: 1.5px dashed rgba(113,112,255,0.30);
          border-radius: 10px; padding: 12px 20px; text-align: center;
          cursor: pointer; transition: border-color 0.2s, background 0.2s;
          position: relative; margin-bottom: 8px;
        }
        .wl-upload-zone:hover, .wl-upload-zone.drag-active {
          border-color: rgba(113,112,255,0.65);
          background: rgba(113,112,255,0.04);
        }
        .wl-upload-zone input[type="file"] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .wl-upload-icon { font-size: 22px; margin-bottom: 6px; }
        .wl-upload-label { color: #6b7280; font-size: 11.5px; line-height: 1.55; }
        .wl-upload-label strong { color: #a0a4d0; }

        .wl-file-pill {
          display: flex; align-items: center; gap: 10px;
          background: rgba(113,112,255,0.08); border: 1px solid rgba(113,112,255,0.20);
          border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;
        }
        .wl-file-name { font-size: 12px; color: #a0a4d0; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wl-file-remove { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 16px; line-height: 1; padding: 0; }

        .wl-screen-enter { animation: wl-screen-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes wl-screen-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .wl-card-heading {
          font-size: 15px; font-weight: 600; color: #e0e4ff;
          margin: 0 0 5px; text-align: center;
        }
        .wl-card-sub {
          font-size: 12px; color: #6b7280; text-align: center; margin: 0 0 18px; line-height: 1.5;
        }

        .wl-field-label {
          display: block; font-size: 11px; color: #8b91b8; margin-bottom: 6px;
          letter-spacing: 0.04em; text-transform: uppercase; font-weight: 500;
        }
        .wl-field-label span { color: rgba(113,112,255,0.9); }

        .wl-progress-wrap {
          border-radius: 11px; overflow: hidden;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(113,112,255,0.18);
          padding: 14px 16px;
          margin-bottom: 10px;
          position: relative;
        }
        .wl-progress-label {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; font-size: 12px; color: #a0a4d0; letter-spacing: 0.01em;
        }
        .wl-progress-pct { font-variant-numeric: tabular-nums; color: rgba(160,170,255,0.9); font-weight: 500; }
        .wl-progress-track {
          height: 4px; border-radius: 99px;
          background: rgba(255,255,255,0.06);
          overflow: hidden; position: relative;
        }
        .wl-progress-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, rgba(94,106,210,1) 0%, rgba(130,143,255,1) 100%);
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .wl-progress-fill::after {
          content: ''; position: absolute; top: 0; right: 0;
          width: 40px; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55));
          border-radius: 99px;
          animation: wl-progress-shimmer 1.2s ease-in-out infinite;
        }
        @keyframes wl-progress-shimmer { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        .wl-progress-done .wl-progress-fill::after { display: none; }
        .wl-progress-done .wl-progress-fill {
          background: linear-gradient(90deg, rgba(16,185,129,0.8) 0%, rgba(52,211,153,1) 100%);
        }

        .wl-error { font-size: 12px; color: var(--error); margin-top: 10px; text-align: center; }

        .wl-choice-grid { display: grid; gap: 10px; margin-top: 14px; }
        .wl-choice-card {
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02); padding: 14px 16px; text-align: left;
        }
        .wl-choice-card.wl-choice-primary {
          border-color: rgba(113,112,255,0.35);
          background: rgba(113,112,255,0.06);
        }
        .wl-choice-title { font-size: 13px; font-weight: 600; color: #e0e4ff; margin: 0 0 4px; letter-spacing: 0.01em; }
        .wl-choice-sub { font-size: 11.5px; color: #8b91b8; margin: 0 0 10px; line-height: 1.5; }

        .wl-success-icon {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px; font-size: 18px;
        }

        @media (min-width: 768px) {
          .wl-page { min-height: calc(100dvh - 72px); }
        }
      `}</style>

      <main className="wl-page">
        <div className="wl-aurora"   aria-hidden="true" />
        <div className="wl-grid"     aria-hidden="true" />
        <div className="wl-bands"    aria-hidden="true" />
        <div className="wl-noise"    aria-hidden="true" />
        <div className="wl-vignette" aria-hidden="true" />
        <div className="wl-floor"    aria-hidden="true" />

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

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            zIndex: 2, opacity: 0,
            animation: 'wl-particles-in 3s ease 1200ms forwards',
          }}
          aria-hidden="true"
        />

        <aside className="wl-demo-side">
          <div className="wl-demo-inner wl-demo-slide-up" style={{'--rd':'680ms'} as React.CSSProperties}>
            <div className="wl-demo-frame">
              <div className="wl-demo-glow" aria-hidden="true" />
              <video
                className="wl-demo-video"
                src="/demo/spectr-demo.mp4"
                poster="/demo/spectr-demo-poster.jpg"
                autoPlay muted loop playsInline
                preload="metadata"
                aria-label="Spectr demo"
              />
            </div>
          </div>
        </aside>

        <div style={{
          position:'relative', zIndex:3,
          width:'min(580px, calc(100vw - 48px))',
          textAlign:'center',
        }}>
          <div className="wl-neon-mark" aria-hidden="true">Spectr</div>

          <div className="wl-h1-wrap">
            <h1 className="wl-h1">
              <WordReveal text="See an app." baseDelay={180} className="wl-h1-line1" />
              <WordReveal text="Ship an app." baseDelay={320} className="wl-h1-line2" />
            </h1>
          </div>

          <div className="wl-divider" />

          <p className="wl-sub wl-reveal" style={{'--rd':'520ms'} as React.CSSProperties}>
            Record any app. Get a UI blueprint inspired by it —<br />
            ready for your <strong>agent to design</strong>.
          </p>

          <div className="wl-card-wrap">
            <div className="wl-card">
              {screen === 'details' && (
                <div className="wl-screen-enter">
                  {selectedFile ? (
                    <div className="wl-file-pill">
                      <span style={{ fontSize: 16 }}>🎬</span>
                      <span className="wl-file-name">{selectedFile.name}</span>
                      <button
                        className="wl-file-remove"
                        onClick={() => {
                          uploadDoneRef.current = true
                          cancelAnimationFrame(rafRef.current)
                          setSelectedFile(null)
                          setUploadState('idle')
                          setUploadProgress(0)
                          setFileError(null)
                        }}
                        aria-label="Remove file"
                      >×</button>
                    </div>
                  ) : (
                    <div
                      className={`wl-upload-zone${dragActive ? ' drag-active' : ''}`}
                      onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="wl-upload-icon">🎬</div>
                      <div className="wl-upload-label">
                        <strong>Drop your screen recording here</strong><br />
                        or click to browse · MP4 only · max 500 MB
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp4,video/mp4"
                        onChange={handleFileChange}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <label className="wl-field-label">Reference app <span>*</span></label>
                  <input
                    className="wl-input"
                    type="text"
                    placeholder="DoorDash, Duolingo, Notion..."
                    value={referenceApp}
                    onChange={e => setReferenceApp(e.target.value)}
                  />

                  <label className="wl-field-label">Your app name</label>
                  <input
                    className="wl-input"
                    type="text"
                    placeholder={referenceApp.trim() || 'Same as reference app'}
                    value={yourAppName}
                    onChange={e => setYourAppName(e.target.value)}
                  />

                  {uploadState === 'uploading' || uploadState === 'done' ? (
                    <div className={`wl-progress-wrap${uploadState === 'done' ? ' wl-progress-done' : ''}`}>
                      <div className="wl-progress-label">
                        <span>{uploadState === 'done' ? 'Upload complete ✓' : 'Uploading…'}</span>
                        <span className="wl-progress-pct">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="wl-progress-track">
                        <div className="wl-progress-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      className="wl-btn"
                      onClick={handleContinue}
                      disabled={!canContinue}
                    >
                      Continue →
                    </button>
                  )}

                  {fileError && <p className="wl-error">{fileError}</p>}
                  {uploadState === 'error' && (
                    <p className="wl-error">Upload failed — check your file and try again.</p>
                  )}
                </div>
              )}

              {screen === 'choice' && (
                <div className="wl-screen-enter">
                  <p className="wl-card-heading">How would you like your blueprint?</p>
                  <p className="wl-card-sub">Drop your email and choose a path.</p>

                  <input
                    className="wl-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />

                  <div className="wl-choice-grid">
                    <div className="wl-choice-card wl-choice-primary">
                      <p className="wl-choice-title">Full spec — $19</p>
                      <p className="wl-choice-sub">
                        Automatic processing. Your complete blueprint is ready in about three minutes.
                      </p>
                      <button
                        className="wl-btn"
                        onClick={handlePaid}
                        disabled={!email.trim() || choiceBusy !== null}
                      >
                        {choiceBusy === 'paid' ? 'Sending to Stripe…' : 'Pay & generate →'}
                      </button>
                    </div>

                    <div className="wl-choice-card">
                      <p className="wl-choice-title">Free demo</p>
                      <p className="wl-choice-sub">
                        Sample preview only — not a full spec. We review your video and email a demo within 24 hours.
                      </p>
                      <button
                        className="wl-btn-ghost"
                        onClick={handleFree}
                        disabled={!email.trim() || choiceBusy !== null}
                      >
                        {choiceBusy === 'free' ? 'Sending…' : 'Get free demo'}
                      </button>
                    </div>
                  </div>

                  {choiceError && <p className="wl-error">{choiceError}</p>}
                </div>
              )}

              {screen === 'sending' && (
                <div className="wl-screen-enter" style={{ padding: '16px 0' }}>
                  <p className="wl-card-heading">Sending your request…</p>
                  <p className="wl-card-sub">One moment.</p>
                </div>
              )}

              {screen === 'submitted' && (
                <div className="wl-screen-enter" style={{ padding: '16px 0' }}>
                  <div className="wl-success-icon">✓</div>
                  <p className="wl-card-heading">You&rsquo;re in.</p>
                  <p className="wl-card-sub">
                    We&rsquo;ll review your recording and email a sample blueprint within 24 hours.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
