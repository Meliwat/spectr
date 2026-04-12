'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project } from '@/lib/types'
import GhostSkeleton from '@/components/GhostSkeleton'
import StatusTracker from '@/components/StatusTracker'
import SpecPreview from '@/components/SpecPreview'
import { useToast } from '@/hooks/useToast'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)
  const readyToastShown = useRef(false)
  const copiedTimeout = useRef<number | null>(null)

  useEffect(() => {
    supabase.from('projects').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setProject(data) })

    const channel = supabase
      .channel(`project-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
        payload => setProject(payload.new as Project)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    if (project?.status === 'complete' && !download) {
      fetch(`/api/projects/${id}/download`)
        .then(r => r.json())
        .then(d => {
          if (d.url) {
            setDownload({ url: d.url, filename: d.filename || 'bundle.zip' })
            setTimeout(() => downloadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
          }
        })
    }
  }, [project?.status, id, download])

  useEffect(() => {
    if (download && !readyToastShown.current) {
      readyToastShown.current = true
      toast('Spec ready — bundle downloading', 'success')
    }
  }, [download, toast])

  useEffect(() => () => {
    if (copiedTimeout.current) {
      window.clearTimeout(copiedTimeout.current)
    }
  }, [])

  async function retry() {
    toast('Retrying pipeline…', 'info')
    await fetch(`/api/projects/${id}/retry`, { method: 'POST' })
    setProject(p => p ? { ...p, status: 'pending', error_text: null } : p)
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText('claude --file spec.md')
      setCopied(true)
      if (copiedTimeout.current) {
        window.clearTimeout(copiedTimeout.current)
      }
      copiedTimeout.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy the CLI command', 'error')
    }
  }

  if (!project) {
    return (
      <main className="page-frame">
        <section className="page-shell">
          <div className="max-w-3xl">
            <a href="/app/projects" className="mono text-xs" style={{ color: 'var(--subdued)' }}>← projects</a>
            <div className="mt-5 flex items-center gap-2">
              <span className="mono text-xs" style={{ color: 'var(--subdued)' }}>{id.slice(0, 8)}</span>
            </div>
            <GhostSkeleton className="mt-6" style={{ width: 192, height: 32, borderRadius: 8 }} />
            <GhostSkeleton className="mt-8" style={{ width: '100%', height: 128, borderRadius: 8 }} />
          </div>
        </section>
      </main>
    )
  }

  const isLive = project.status !== 'complete' && project.status !== 'failed'

  return (
    <main className="page-frame">
      <section className="page-shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div>
            <a href="/app/projects" className="mono text-xs" style={{ color: 'var(--subdued)' }}>← projects</a>
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
              {project.status === 'complete' ? 'Spec ready.' : 'Generating spec...'}
            </h1>

            {project.reference_app && (
              <p className="text-sm mb-8" style={{ color: 'var(--muted)', letterSpacing: '-0.165px' }}>
                {project.reference_app}
                {project.your_app_name && project.your_app_name !== project.reference_app
                  ? ` -> ${project.your_app_name}`
                  : ''}
              </p>
            )}

            <StatusTracker project={project} />

            {project.status === 'complete' && download && (
              <div ref={downloadRef} className="panel mt-8 space-y-4 p-5" style={{ borderRadius: 16 }}>
                <a
                  href={download.url}
                  download={download.filename}
                  className="btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                >
                  Download bundle
                </a>
                <div
                  className="mono rounded-xl px-4 py-4 text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--muted)',
                    lineHeight: 1.65,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <span>
                    Unzip, run <span style={{ color: 'var(--violet)' }}>./setup.sh</span>, fill in <span style={{ color: 'var(--violet)' }}>.env</span>, then <span style={{ color: 'var(--violet)' }}>claude --file spec.md</span>
                  </span>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="btn"
                    style={{ padding: '8px 10px', minHeight: 32, flexShrink: 0 }}
                    aria-label="Copy Claude command"
                  >
                    <span style={{ display: 'inline-flex', animation: copied ? 'ghost-fade-in 0.2s ease' : undefined }}>
                      {copied ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.75 7.25 5.25 9.75 11.25 3.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M5 4V2.75A1.25 1.25 0 0 1 6.25 1.5h4A1.25 1.25 0 0 1 11.5 2.75v4A1.25 1.25 0 0 1 10.25 8H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3.75 5A1.25 1.25 0 0 0 2.5 6.25v5A1.25 1.25 0 0 0 3.75 12.5h4A1.25 1.25 0 0 0 9 11.25v-5A1.25 1.25 0 0 0 7.75 5h-4Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {project.status === 'failed' && (
              <div
                className="mt-8 rounded-2xl px-5 py-5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)' }}
              >
                <p className="text-sm" style={{ color: 'var(--error)', lineHeight: 1.6 }}>
                  {project.error_text || 'Pipeline failed.'}
                </p>
                <button onClick={retry} className="btn mt-4 px-6 py-2 text-sm">
                  Retry
                </button>
              </div>
            )}

            {project.spec_md_text && <SpecPreview content={project.spec_md_text} />}
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <p className="section-title">Run details</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Reference</span>
                  <span className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
                    {project.reference_app || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Output name</span>
                  <span className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
                    {project.your_app_name || project.reference_app || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="helper-copy">Download</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>
                    {download?.filename ?? 'bundle.zip'}
                  </span>
                </div>
              </div>
            </div>

            <div className="panel-soft p-5">
              <p className="section-title">Next step</p>
              <p className="mt-3 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
                Once the bundle is ready, download it, inspect the generated brief, then hand `spec.md` to Claude Code.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
