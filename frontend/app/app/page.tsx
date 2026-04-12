'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UploadZone from '@/components/UploadZone'
import BrandingForm from '@/components/BrandingForm'
import { useToast } from '@/hooks/useToast'

function buildBundlePlaceholder(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24)

  return slug ? `com.acme.${slug}` : 'com.acme.myapp'
}

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mp4File, setMp4File] = useState<File | null>(null)
  const [referenceApp, setReferenceApp] = useState('')
  const [yourAppName, setYourAppName] = useState('')
  const [bundleId, setBundleId] = useState('')
  const [brandColors, setBrandColors] = useState<Record<string, string> | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bundlePlaceholder = useMemo(
    () => buildBundlePlaceholder(yourAppName || referenceApp),
    [yourAppName, referenceApp],
  )

  const canSubmit = mp4File && referenceApp.trim().length > 0 && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const projectId = crypto.randomUUID()

      const mp4Key = `${projectId}/input.mp4`
      let logoKey: string | null = null

      const uploads: Promise<unknown>[] = [
        supabase.storage
          .from('spectr-uploads')
          .upload(mp4Key, mp4File, { contentType: 'video/mp4', upsert: true })
          .then(({ error: err }) => { if (err) throw err }),
      ]
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        logoKey = `${projectId}/logo.${ext}`
        uploads.push(
          supabase.storage
            .from('spectr-uploads')
            .upload(logoKey, logoFile, { contentType: logoFile.type, upsert: true })
            .then(({ error: err }) => { if (err) throw err }),
        )
      }
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
          logo_s3_key: logoKey,
          bundle_id: bundleId.trim() || null,
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

  return (
    <main className="page-frame">
      <section className="page-shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="panel-strong p-6 sm:p-8">
            <span className="eyebrow">New reverse-engineering run</span>
            <h1
              className="mt-6 text-4xl sm:text-5xl"
              style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.04 }}
            >
              Build the brief before
              <br />
              you write a line of code.
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--muted)', letterSpacing: '-0.165px', lineHeight: 1.65 }}>
              Upload a product recording, name the source app, and Spectr will generate a dark, implementation-ready teardown across UI, backend, and setup.
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
                <p className="mt-2 helper-copy">Use the real product name so backend research has an anchor.</p>
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
                <p className="mt-2 helper-copy">Leave blank to keep the reference name in the generated bundle.</p>
              </div>
            </div>

            <BrandingForm
              onColors={setBrandColors}
              onLogo={setLogoFile}
              onBundleId={setBundleId}
              bundlePlaceholder={bundlePlaceholder}
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
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={canSubmit ? 'btn-primary' : 'btn'}
              >
                {loading ? 'Uploading...' : 'Generate spec'}
              </button>
              <p className="helper-copy">Bundle upload, live project status, and downloadable `spec.md` package included.</p>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <p className="section-title">What gets generated</p>
              <div className="mt-4 space-y-3">
                {[
                  ['Frontend', 'Screen-by-screen breakdown with shared component inventory.'],
                  ['Backend', 'Research-backed stack, entities, auth, and deployment notes.'],
                  ['Bundle', 'A stitched spec plus env and setup files ready to download.'],
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
              <p className="section-title">Current defaults</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Theme</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>Dark native</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Frame cap</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>80 unique</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Output</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>bundle.zip</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
