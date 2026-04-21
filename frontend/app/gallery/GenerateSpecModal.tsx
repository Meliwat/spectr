'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'appstore' | 'recording'

export default function GenerateSpecModal({
  open,
  onClose,
  defaultReferenceApp,
}: {
  open: boolean
  onClose: () => void
  defaultReferenceApp?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('appstore')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // App Store tab state
  const [appStoreUrl, setAppStoreUrl] = useState('')

  // Recording tab state
  const [file, setFile] = useState<File | null>(null)
  const [referenceApp, setReferenceApp] = useState(defaultReferenceApp ?? '')
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'submitting'>('idle')
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Reset when opened
  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
    setUploadPct(0)
    setUploadStage('idle')
    setAppStoreUrl('')
    setFile(null)
    setReferenceApp(defaultReferenceApp ?? '')
  }, [open, defaultReferenceApp])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const submitAppStore = useCallback(async () => {
    setError(null)
    const url = appStoreUrl.trim()
    if (!url) { setError('Paste an App Store URL.'); return }
    if (!/id\d+/.test(url) && !/^\d+$/.test(url)) {
      setError('That doesn\u2019t look like an App Store URL.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/projects/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'appstore', appStoreUrl: url }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.projectId) {
        setError(json?.error || 'Failed to start generation.')
        setBusy(false)
        return
      }
      const { projectId, accessToken } = json
      router.push(`/p/${projectId}?t=${encodeURIComponent(accessToken)}`)
    } catch {
      setError('Network error \u2014 please try again.')
      setBusy(false)
    }
  }, [appStoreUrl, router])

  const submitRecording = useCallback(async () => {
    setError(null)
    if (!file) { setError('Pick an .mp4 to upload.'); return }
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      setError('Only .mp4 files are supported.')
      return
    }
    if (!referenceApp.trim()) {
      setError('What\u2019s the reference app name?')
      return
    }
    setBusy(true)

    try {
      // Step 1 \u2014 mint a signed upload URL
      setUploadStage('uploading')
      const signRes = await fetch('/api/waitlist/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      })
      if (!signRes.ok) {
        const j = await signRes.json().catch(() => ({}))
        setError(j?.error || 'Upload failed to start.')
        setBusy(false); setUploadStage('idle'); return
      }
      const { key, token } = await signRes.json()

      // Step 2 \u2014 upload the file directly to Supabase Storage
      setUploadPct(10)
      const { error: uploadErr } = await supabase.storage
        .from('waitlist-videos')
        .uploadToSignedUrl(key, token, file, { contentType: 'video/mp4' })
      if (uploadErr) {
        setError('Upload failed.')
        setBusy(false); setUploadStage('idle'); return
      }
      setUploadPct(100)

      // Step 3 \u2014 create project + trigger worker
      setUploadStage('submitting')
      const res = await fetch('/api/projects/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'recording',
          video_s3_key: key,
          video_filename: file.name,
          reference_app: referenceApp.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.projectId) {
        setError(json?.error || 'Could not create project.')
        setBusy(false); setUploadStage('idle'); return
      }
      const { projectId, accessToken } = json
      router.push(`/p/${projectId}?t=${encodeURIComponent(accessToken)}`)
    } catch {
      setError('Network error \u2014 please try again.')
      setBusy(false); setUploadStage('idle')
    }
  }, [file, referenceApp, router])

  if (!open) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .gsm-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(5,6,12,0.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: gsmFadeIn 180ms ease;
        }
        @keyframes gsmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .gsm-card {
          position: relative;
          width: 100%;
          max-width: 520px;
          background: linear-gradient(180deg, rgba(20,22,36,0.96) 0%, rgba(12,13,22,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 28px;
          color: #e8ebff;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(122,108,255,0.12);
        }
        .gsm-close {
          position: absolute; top: 14px; right: 14px;
          width: 32px; height: 32px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(230,232,245,0.8);
          font-size: 18px; line-height: 1;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s ease;
        }
        .gsm-close:hover { background: rgba(255,255,255,0.12); }
        .gsm-title {
          font-size: 20px; font-weight: 600; letter-spacing: -0.01em;
          margin: 0 0 4px;
        }
        .gsm-sub {
          font-size: 13px; color: rgba(200,210,240,0.66);
          margin: 0 0 18px;
        }
        .gsm-tabs {
          display: grid; grid-template-columns: 1fr 1fr;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 18px;
        }
        .gsm-tab {
          padding: 9px 12px; font-size: 13px;
          border-radius: 7px;
          background: transparent; border: 0;
          color: rgba(210,218,240,0.7);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .gsm-tab.active {
          background: linear-gradient(135deg, #7a6cff 0%, #a88bff 100%);
          color: #0a0b14; font-weight: 600;
          box-shadow: 0 4px 14px rgba(122,108,255,0.28);
        }
        .gsm-label {
          display: block; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(170,180,220,0.75);
          margin: 0 0 6px;
        }
        .gsm-input {
          width: 100%;
          padding: 11px 14px;
          font-size: 14px;
          color: #f3f4fb;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .gsm-input:focus {
          border-color: rgba(168,139,255,0.5);
          background: rgba(255,255,255,0.06);
        }
        .gsm-input::placeholder { color: rgba(200,210,240,0.38); }
        .gsm-file {
          display: block;
          padding: 22px 16px;
          text-align: center;
          border: 1px dashed rgba(255,255,255,0.18);
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
          color: rgba(210,218,240,0.78);
          cursor: pointer;
          font-size: 13px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .gsm-file:hover {
          border-color: rgba(168,139,255,0.4);
          background: rgba(168,139,255,0.04);
        }
        .gsm-file.has-file {
          border-style: solid;
          border-color: rgba(168,139,255,0.45);
          background: rgba(168,139,255,0.06);
          color: #e8ebff;
        }
        .gsm-hint {
          font-size: 12px;
          color: rgba(200,210,240,0.52);
          margin: 8px 0 0;
          line-height: 1.5;
        }
        .gsm-submit {
          width: 100%;
          margin-top: 20px;
          padding: 13px 16px;
          font-size: 14px; font-weight: 600;
          border: 0; border-radius: 10px;
          background: linear-gradient(135deg, #7a6cff 0%, #a88bff 100%);
          color: #0a0b14;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(122,108,255,0.32);
          transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .gsm-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(122,108,255,0.4); }
        .gsm-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .gsm-error {
          margin-top: 12px;
          padding: 10px 12px;
          font-size: 13px;
          color: #ffb8b8;
          background: rgba(255,90,90,0.08);
          border: 1px solid rgba(255,90,90,0.25);
          border-radius: 8px;
        }
        .gsm-progress {
          margin-top: 10px;
          height: 4px; width: 100%;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          overflow: hidden;
        }
        .gsm-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #7a6cff, #a88bff);
          transition: width 0.2s ease;
        }
        .gsm-field { margin-bottom: 14px; }
        .gsm-field:last-of-type { margin-bottom: 0; }
      `}} />

      <div
        className="gsm-backdrop"
        onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gsm-title"
      >
        <div className="gsm-card">
          <button
            type="button"
            className="gsm-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>

          <h3 id="gsm-title" className="gsm-title">Generate your own spec</h3>
          <p className="gsm-sub">
            Drop an App Store URL or an MP4 screen recording. We produce a full
            design blueprint you can hand to Claude Code.
          </p>

          <div className="gsm-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'appstore'}
              className={`gsm-tab ${tab === 'appstore' ? 'active' : ''}`}
              onClick={() => setTab('appstore')}
              disabled={busy}
            >
              App Store URL
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'recording'}
              className={`gsm-tab ${tab === 'recording' ? 'active' : ''}`}
              onClick={() => setTab('recording')}
              disabled={busy}
            >
              Screen recording
            </button>
          </div>

          {tab === 'appstore' ? (
            <>
              <div className="gsm-field">
                <label className="gsm-label" htmlFor="gsm-url">App Store URL</label>
                <input
                  id="gsm-url"
                  className="gsm-input"
                  type="url"
                  placeholder="https://apps.apple.com/us/app/.../id123456789"
                  value={appStoreUrl}
                  onChange={(e) => setAppStoreUrl(e.target.value)}
                  disabled={busy}
                  autoFocus
                />
                <p className="gsm-hint">
                  We fetch the preview screenshots from the App Store and build
                  a spec from them. Coverage depends on how many screens the
                  listing shows (usually 5–10).
                </p>
              </div>
              <button
                type="button"
                className="gsm-submit"
                disabled={busy}
                onClick={submitAppStore}
              >
                {busy ? 'Starting…' : 'Generate spec'}
              </button>
            </>
          ) : (
            <>
              <div className="gsm-field">
                <label className="gsm-label">Screen recording (.mp4)</label>
                <label
                  className={`gsm-file ${file ? 'has-file' : ''}`}
                  onClick={() => !busy && fileRef.current?.click()}
                >
                  {file ? file.name : 'Click to choose an .mp4'}
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                />
                {uploadStage === 'uploading' ? (
                  <div className="gsm-progress">
                    <div className="gsm-progress-bar" style={{ width: `${uploadPct}%` }} />
                  </div>
                ) : null}
              </div>
              <div className="gsm-field">
                <label className="gsm-label" htmlFor="gsm-ref">Reference app name</label>
                <input
                  id="gsm-ref"
                  className="gsm-input"
                  type="text"
                  placeholder="e.g. Airbnb"
                  value={referenceApp}
                  onChange={(e) => setReferenceApp(e.target.value)}
                  disabled={busy}
                />
              </div>
              <button
                type="button"
                className="gsm-submit"
                disabled={busy}
                onClick={submitRecording}
              >
                {uploadStage === 'uploading'
                  ? 'Uploading…'
                  : uploadStage === 'submitting'
                    ? 'Starting…'
                    : 'Generate spec'}
              </button>
            </>
          )}

          {error ? <div className="gsm-error">{error}</div> : null}
        </div>
      </div>
    </>
  )
}
