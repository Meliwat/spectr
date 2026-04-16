'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project } from '@/lib/types'
import StatusTracker from '@/components/StatusTracker'
import SpecPreview from '@/components/SpecPreview'
import { useToast } from '@/hooks/useToast'

export default function ProjectClient({
  id,
  initialProject,
  accessToken,
}: {
  id: string
  initialProject: Project
  /** When set, the viewer isn't signed in — we poll rather than subscribe,
   * and append ?t=<token> to every project-scoped API call. */
  accessToken?: string
}) {
  const { toast } = useToast()
  const [project, setProject] = useState<Project>(initialProject)
  const [debugLines, setDebugLines] = useState<string[]>([])
  const downloadRef = useRef<HTMLDivElement>(null)
  const readyToastShown = useRef(initialProject.status === 'complete')

  const tokenQs = accessToken ? `?t=${encodeURIComponent(accessToken)}` : ''

  useEffect(() => {
    if (project.processing_mode === 'manual') {
      return  // No realtime for free samples — worker doesn't fire.
    }

    // Token-only viewers have no JWT, so the realtime subscription's RLS
    // check rejects them. Fall back to polling /api/projects/[id] every 3s.
    if (accessToken) {
      let cancelled = false
      const poll = async () => {
        try {
          const r = await fetch(`/api/projects/${id}${tokenQs}`, { cache: 'no-store' })
          if (!r.ok) return
          const data = (await r.json()) as Project
          if (!cancelled) setProject(data)
        } catch {}
      }
      const interval = window.setInterval(poll, 3000)
      return () => { cancelled = true; window.clearInterval(interval) }
    }

    // Authenticated path: realtime under the user's JWT.
    const channel = supabase
      .channel(`project-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
        payload => setProject(payload.new as Project)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, project.processing_mode, accessToken, tokenQs])

  useEffect(() => {
    if (project?.status === 'complete' && !readyToastShown.current) {
      readyToastShown.current = true
      toast('Your spec is ready.', 'success')
      setTimeout(() => downloadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }, [project?.status, toast])

  useEffect(() => {
    let cancelled = false

    async function loadLogs() {
      try {
        const response = await fetch(`/api/projects/${id}/logs${tokenQs}`, { cache: 'no-store' })
        const data = await response.json()
        if (!cancelled && Array.isArray(data?.lines)) {
          setDebugLines(data.lines)
        }
      } catch {
        if (!cancelled) {
          setDebugLines([])
        }
      }
    }

    loadLogs()
    const interval = window.setInterval(loadLogs, 2000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [id, tokenQs])

  async function retry() {
    toast('Starting a fresh pass...', 'info')
    await fetch(`/api/projects/${id}/retry`, { method: 'POST' })
    setProject(p => p ? { ...p, status: 'pending', error_text: null } : p)
  }

  const isLive = project.status !== 'complete' && project.status !== 'failed'
  const downloadFilename = project.bundle_s3_key ? 'bundle.zip' : 'spec.md'
  const downloadHref = `/api/projects/${id}/download${tokenQs}`

  return (
    <main className="page-frame">
      <section className="page-shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div>
            {!accessToken && (
              <a href="/app/projects" className="mono text-xs" style={{ color: 'var(--subdued)' }}>← specs</a>
            )}
            <div className="mb-5 mt-5 flex items-center">
              <p className="mono text-xs" style={{ color: 'var(--subdued)' }}>{id.slice(0, 8)}</p>
              {isLive && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--violet)',
                    animation: 'ghost-pulse 2s ease-in-out infinite',
                    marginLeft: 8,
                  }}
                />
              )}
            </div>

            <h1
              className="text-4xl mb-2"
              style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.08 }}
            >
              {project.status === 'complete' ? 'Your spec is ready.' : 'Your spec is taking shape.'}
            </h1>

            {project.reference_app && (
              <p className="text-sm mb-8" style={{ color: 'var(--muted)', letterSpacing: '-0.165px' }}>
                {project.your_app_name && project.your_app_name !== project.reference_app
                  ? `Inspired by ${project.reference_app}, imagined as ${project.your_app_name}`
                  : `Inspired by ${project.reference_app}`}
              </p>
            )}

            <StatusTracker project={project} debugLines={debugLines} />

            {project.status === 'complete' && (
              <div ref={downloadRef} className="panel mt-8 space-y-4 p-5" style={{ borderRadius: 16 }}>
                <a
                  href={downloadHref}
                  className="btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                >
                  Download spec
                </a>
                <div
                  className="rounded-xl px-4 py-4 text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--muted)',
                    lineHeight: 1.65,
                  }}
                >
                  Download the spec whenever you’re ready. It brings together the screens, patterns, and design language in one place.
                </div>
              </div>
            )}

            {project.spec_md_text && <SpecPreview content={project.spec_md_text} />}

            {project.status === 'failed' && (
              <div
                className="mt-8 rounded-2xl px-5 py-5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)' }}
              >
                <p className="text-sm" style={{ color: 'var(--error)', lineHeight: 1.6 }}>
                  {project.error_text || 'Something interrupted this pass.'}
                </p>
                <button onClick={retry} className="btn mt-4 px-6 py-2 text-sm">
                  Try again
                </button>
              </div>
            )}

            <details className="panel mt-8 p-5">
              <summary
                className="cursor-pointer list-none"
                style={{ color: 'var(--text)', fontWeight: 510 }}
              >
                For the curious
              </summary>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                Open this if you want to see the raw activity behind the scenes.
              </p>
              <div
                className="mono mt-4 text-xs"
                style={{
                  maxHeight: 280,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  color: 'var(--muted)',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                {debugLines.length ? debugLines.join('\n') : 'Waiting for fresh updates...'}
              </div>
            </details>

          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <p className="section-title">This spec</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Inspired by</span>
                  <span className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
                    {project.reference_app || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Named as</span>
                  <span className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
                    {project.your_app_name || project.reference_app || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">File</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>
                    {downloadFilename}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Format</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>
                    Frontend spec
                  </span>
                </div>
              </div>
            </div>

            <div className="panel-soft p-5">
              <p className="section-title">What to do next</p>
              <p className="mt-3 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
                Download the spec, share it with your agents, and use it as the blueprint for whatever comes next.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
