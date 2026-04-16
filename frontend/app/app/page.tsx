'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UploadZone from '@/components/UploadZone'
import BrandingForm from '@/components/BrandingForm'
import BillingCTA from '@/components/BillingCTA'
import { useToast } from '@/hooks/useToast'
import { paywallEnabled } from '@/lib/paywall'

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mp4File, setMp4File] = useState<File | null>(null)
  const [referenceApp, setReferenceApp] = useState('')
  const [yourAppName, setYourAppName] = useState('')
  const [brandColors, setBrandColors] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [hasCredits, setHasCredits] = useState<boolean | null>(null)
  const [modalBusy, setModalBusy] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const enabled = paywallEnabled()
  const canSubmit = mp4File && referenceApp.trim().length > 0 && !loading

  // ─── Check credits on mount (paywall on only) ─────────────────────────
  useEffect(() => {
    if (!enabled) { setHasCredits(true); return }
    fetch('/api/billing/credits')
      .then((r) => (r.ok ? r.json() : { available: 0 }))
      .then((d) => setHasCredits((d.available ?? 0) > 0))
      .catch(() => setHasCredits(false))
  }, [enabled])

  // ─── Post-Stripe redirect: auto-submit from localStorage ──────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchased') !== '1') return

    window.history.replaceState({}, '', '/app')

    const raw = localStorage.getItem('spectr_pending')
    if (!raw) return
    const pending = JSON.parse(raw)
    localStorage.removeItem('spectr_pending')

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const r = await fetch('/api/billing/credits')
        const data = await r.json()
        if ((data.available ?? 0) > 0) {
          clearInterval(interval)
          setHasCredits(true)
          await createProject(pending.projectId, pending.mp4Key, pending.reference_app, pending.your_app_name, pending.brand_colors, 'auto')
        } else if (attempts >= 15) {
          clearInterval(interval)
          setError('Payment is still processing — refresh the page in a moment.')
        }
      } catch {
        if (attempts >= 15) clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Core: create project row + trigger worker or notify founder ──────
  async function createProject(
    projectId: string, mp4Key: string,
    refApp: string, appName: string,
    colors: Record<string, string> | null,
    mode: 'auto' | 'sample',
  ) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          mp4_s3_key: mp4Key,
          reference_app: refApp,
          your_app_name: appName || refApp,
          brand_colors: colors,
          logo_s3_key: null,
          bundle_id: null,
          mode,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/app/projects/${projectId}`)
    } catch (e: any) {
      console.error('[submit error]', e)
      const msg = e.message || 'Something went wrong'
      setError(msg)
      toast(msg, 'error')
      setLoading(false)
    }
  }

  // ─── Upload video to Storage, then proceed based on mode ──────────────
  async function uploadAndProceed(mode: 'auto' | 'sample') {
    if (!canSubmit) return
    setModalBusy(true)
    setModalError(null)
    setShowModal(false)

    const projectId = crypto.randomUUID()
    const mp4Key = `${projectId}/input.mp4`

    try {
      setLoading(true)
      setError('')

      const { error: upErr } = await supabase.storage
        .from('spectr-uploads')
        .upload(mp4Key, mp4File!, { contentType: 'video/mp4', upsert: true })
      if (upErr) throw upErr

      if (mode === 'auto' && enabled && !hasCredits) {
        localStorage.setItem('spectr_pending', JSON.stringify({
          projectId, mp4Key,
          reference_app: referenceApp.trim(),
          your_app_name: yourAppName.trim() || referenceApp.trim(),
          brand_colors: brandColors,
        }))
        const r = await fetch('/api/billing/checkout', { method: 'POST' })
        if (!r.ok) throw new Error('Checkout failed')
        const { url } = await r.json()
        window.location.href = url
        return
      }

      await createProject(projectId, mp4Key, referenceApp.trim(), yourAppName.trim(), brandColors, mode)
    } catch (e: any) {
      console.error('[upload error]', e)
      const msg = e.message || 'Upload failed'
      setError(msg)
      toast(msg, 'error')
      setLoading(false)
      setModalBusy(false)
    }
  }

  // ─── Submit gate: direct submit or open modal ─────────────────────────
  function handleSubmitClick() {
    if (!canSubmit) return
    if (!enabled || hasCredits) {
      uploadAndProceed('auto')
    } else {
      setShowModal(true)
    }
  }

  return (
    <main className="page-frame">
      <section className="page-shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="panel-strong p-6 sm:p-8">
            <span className="eyebrow">New blueprint</span>
            <h1
              className="mt-6 text-4xl sm:text-5xl"
              style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.04 }}
            >
              Turn a recording
              <br />
              into a living blueprint.
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--muted)', letterSpacing: '-0.165px', lineHeight: 1.65 }}>
              Upload a mobile app recording, name the product that inspired it, and Spectr will turn what it sees into a detailed blueprint your agents can read, share, and build from.
            </p>

            <div className="mt-8">
              <UploadZone onFile={setMp4File} file={mp4File} />
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="field-label">
                  Reference app <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="DoorDash, Duolingo, Notion..."
                  value={referenceApp}
                  onChange={e => setReferenceApp(e.target.value)}
                  className="input"
                />
                <p className="mt-2 helper-copy">Use the real product name so the blueprint stays grounded in the app you captured.</p>
              </div>
              <div>
                <label className="field-label">Your app name</label>
                <input
                  type="text"
                  placeholder={referenceApp.trim() || 'Same as reference app'}
                  value={yourAppName}
                  onChange={e => setYourAppName(e.target.value)}
                  className="input"
                />
                <p className="mt-2 helper-copy">Leave this blank if you want the blueprint to keep the original name.</p>
              </div>
            </div>

            <BrandingForm
              onColors={setBrandColors}
              showBundleId={false}
            />

            {error && (
              <div
                className="mt-5 rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.24)', color: 'var(--error)' }}
              >
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={handleSubmitClick}
                disabled={!canSubmit}
                className={canSubmit ? 'btn-primary' : 'btn'}
              >
                {loading ? 'Starting...' : 'Create my blueprint'}
              </button>
              <p className="helper-copy">You'll get a live view of the progress and a downloadable spec when it's ready.</p>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <p className="section-title">What you'll receive</p>
              <div className="mt-4 space-y-3">
                {[
                  ['Screens', 'Screen-by-screen notes with hierarchy, patterns, states, and flow.'],
                  ['Design language', 'Color, type, spacing, icon direction, and the details that give the app its feel.'],
                  ['One clear blueprint', 'A structured plan your agents can share, discuss, and build from.'],
                ].map(([title, copy]) => (
                  <div
                    key={title}
                    className="rounded-xl px-4 py-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--text)', fontWeight: 510 }}>{title}</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-soft p-5">
              <p className="section-title">Current approach</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Style</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>Dark, native feel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Coverage</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>Up to 24 distinct moments</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Format</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>Blueprint in, spec out</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <BillingCTA
        open={showModal}
        onClose={() => setShowModal(false)}
        onPaid={() => uploadAndProceed('auto')}
        onFreeDemo={() => uploadAndProceed('sample')}
        busy={modalBusy}
        error={modalError}
      />
    </main>
  )
}
