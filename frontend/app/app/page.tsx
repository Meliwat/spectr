'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UploadZone from '@/components/UploadZone'
import BrandingForm from '@/components/BrandingForm'
import BillingCTA from '@/components/BillingCTA'
import { useToast } from '@/hooks/useToast'

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mp4File, setMp4File] = useState<File | null>(null)
  const [referenceApp, setReferenceApp] = useState('')
  const [yourAppName, setYourAppName] = useState('')
  const [brandColors, setBrandColors] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = mp4File && referenceApp.trim().length > 0 && !loading

  async function handleSubmit(mode: 'auto' | 'sample') {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const projectId = crypto.randomUUID()
      const mp4Key = `${projectId}/input.mp4`

      const uploads: Promise<unknown>[] = [
        supabase.storage
          .from('spectr-uploads')
          .upload(mp4Key, mp4File, { contentType: 'video/mp4', upsert: true })
          .then(({ error: err }) => { if (err) throw err }),
      ]
      await Promise.all(uploads)

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          mp4_s3_key: mp4Key,
          reference_app: referenceApp.trim(),
          your_app_name: yourAppName.trim() || referenceApp.trim(),
          brand_colors: brandColors,
          logo_s3_key: null,
          bundle_id: null,
          mode,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/app/projects/${projectId}`)
    } catch (e: any) {
      console.error('[submit error]', e)
      const message = e.message || 'Something went wrong'
      setError(message)
      toast(message, 'error')
      setLoading(false)
    }
  }

  const renderUploader = ({ mode }: { mode: 'auto' | 'sample' }) => (
    <>
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
          onClick={() => handleSubmit(mode)}
          disabled={!canSubmit}
          className={canSubmit ? 'btn-primary' : 'btn'}
        >
          {loading ? 'Starting...' : mode === 'sample' ? 'Submit for free review' : 'Generate spec'}
        </button>
        <p className="helper-copy">You’ll get a live view of the progress and a downloadable spec when it’s ready.</p>
      </div>
    </>
  )

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

            <BillingCTA renderUploader={renderUploader} />
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <p className="section-title">What you’ll receive</p>
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
    </main>
  )
}
