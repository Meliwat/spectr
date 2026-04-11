'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project } from '@/lib/types'
import StatusTracker from '@/components/StatusTracker'
import SpecPreview from '@/components/SpecPreview'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [project, setProject] = useState<Project | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const downloadRef = useRef<HTMLDivElement>(null)

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
    if (project?.status === 'complete' && !downloadUrl) {
      fetch(`/api/projects/${id}/download`)
        .then(r => r.json())
        .then(d => {
          if (d.url) {
            setDownloadUrl(d.url)
            // Scroll to download button after it appears
            setTimeout(() => downloadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
          }
        })
    }
  }, [project?.status, id, downloadUrl])

  async function retry() {
    await fetch(`/api/projects/${id}/retry`, { method: 'POST' })
    setProject(p => p ? { ...p, status: 'pending', error_text: null } : p)
  }

  return (
    <main className="px-6 py-16 max-w-2xl mx-auto">
      <p className="mono text-xs mb-6" style={{ color: 'var(--subdued)' }}>{id.slice(0, 8)}</p>

      <h1
        className="text-4xl mb-2"
        style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.13 }}
      >
        {project?.status === 'complete' ? 'Spec ready.' : 'Generating spec…'}
      </h1>

      {project?.reference_app && (
        <p className="text-sm mb-10" style={{ color: 'var(--muted)', letterSpacing: '-0.165px' }}>
          {project.reference_app}
          {project.your_app_name && project.your_app_name !== project.reference_app
            ? ` → ${project.your_app_name}`
            : ''}
        </p>
      )}

      {project && <StatusTracker project={project} />}

      {project?.status === 'complete' && downloadUrl && (
        <div ref={downloadRef} className="mt-10 space-y-3">
          <a
            href={downloadUrl}
            download="spec.md"
            className="btn-primary block w-full py-3 text-center text-base"
            style={{ borderRadius: 6 }}
          >
            Download spec.md
          </a>
          <div
            className="px-4 py-3 text-sm mono"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              color: 'var(--muted)',
            }}
          >
            Then run: <span style={{ color: 'var(--violet)' }}>claude --file spec.md</span>
          </div>
        </div>
      )}

      {project?.status === 'failed' && (
        <div className="mt-8 space-y-3">
          <p className="text-sm" style={{ color: 'var(--error)' }}>{project.error_text || 'Pipeline failed.'}</p>
          <button onClick={retry} className="btn px-6 py-2 text-sm">
            Retry
          </button>
        </div>
      )}

      {project?.spec_md_text && <SpecPreview content={project.spec_md_text} />}
    </main>
  )
}
