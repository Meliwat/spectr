'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UploadZone from '@/components/UploadZone'
import BrandingForm from '@/components/BrandingForm'

export default function UploadPage() {
  const router = useRouter()
  const [mp4File, setMp4File] = useState<File | null>(null)
  const [referenceApp, setReferenceApp] = useState('')
  const [yourAppName, setYourAppName] = useState('')
  const [bundleId, setBundleId] = useState('')
  const [brandColors, setBrandColors] = useState<Record<string, string>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = mp4File && referenceApp.trim().length > 0 && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const projectId = crypto.randomUUID()

      const mp4Key = `${projectId}/input.mp4`
      const { error: uploadErr } = await supabase.storage
        .from('spectr-uploads')
        .upload(mp4Key, mp4File, { contentType: 'video/mp4', upsert: true })
      if (uploadErr) throw uploadErr

      let logoKey: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        logoKey = `${projectId}/logo.${ext}`
        await supabase.storage
          .from('spectr-uploads')
          .upload(logoKey, logoFile, { contentType: logoFile.type, upsert: true })
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          mp4_s3_key: mp4Key,
          reference_app: referenceApp.trim(),
          your_app_name: yourAppName.trim() || referenceApp.trim(),
          brand_colors: Object.keys(brandColors).length > 0 ? brandColors : null,
          logo_s3_key: logoKey,
          bundle_id: bundleId.trim() || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/app/projects/${projectId}`)
    } catch (e: any) {
      console.error('[submit error]', e)
      setError(e.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="px-6 py-16 max-w-xl mx-auto">
      <h1
        className="text-4xl mb-2"
        style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.13 }}
      >
        New project
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--muted)', letterSpacing: '-0.165px' }}>
        Upload a screen recording and enter the app name to clone.
      </p>

      <UploadZone onFile={setMp4File} file={mp4File} />

      <div className="mt-8 space-y-5">
        <div>
          <label className="block text-sm mb-2" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
            Reference app <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Duolingo, Airbnb, Notion…"
            value={referenceApp}
            onChange={e => setReferenceApp(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm mb-2" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
            Your app name
          </label>
          <input
            type="text"
            placeholder="Leave blank to keep original name"
            value={yourAppName}
            onChange={e => setYourAppName(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <BrandingForm onColors={setBrandColors} onLogo={setLogoFile} onBundleId={setBundleId} />

      {error && (
        <div className="mt-4 px-4 py-3 rounded text-sm" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', color: 'var(--error)' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`mt-10 w-full py-3 text-base ${canSubmit ? 'btn-primary' : 'btn'}`}
        style={{ borderRadius: 6 }}
      >
        {loading ? 'Uploading…' : 'Generate spec →'}
      </button>
    </main>
  )
}
