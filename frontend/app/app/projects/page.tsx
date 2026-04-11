import { supabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { Project } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const { data: projects } = await supabaseServer
    .from('projects')
    .select('id, status, reference_app, your_app_name, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const statusColor: Record<string, string> = {
    complete: 'var(--success)',
    failed: 'var(--error)',
  }

  return (
    <main className="px-6 py-12 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Projects</h1>
        <Link href="/app" className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--cyan)', color: '#0D0D0F' }}>
          New Spec
        </Link>
      </div>

      {!projects?.length ? (
        <p style={{ color: 'var(--muted)' }}>No projects yet. Upload a recording to get started.</p>
      ) : (
        <div className="space-y-3">
          {(projects as Project[]).map(p => (
            <Link key={p.id} href={`/app/projects/${p.id}`}
              className="flex items-center justify-between px-5 py-4 rounded-xl hover:opacity-80"
              style={{ background: 'var(--surface)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>
                  {p.your_app_name || p.reference_app}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Ref: {p.reference_app} · {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs mono px-2 py-1 rounded-full"
                style={{ color: statusColor[p.status] || 'var(--cyan)', background: '#ffffff11' }}>
                {p.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
