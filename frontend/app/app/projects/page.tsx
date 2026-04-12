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
    <main className="page-frame">
      <section className="page-shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Recent output</span>
            <h1
              className="mt-5 text-4xl"
              style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.08 }}
            >
              Project history
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Every uploaded recording, its current pipeline state, and the generated bundle when complete.
            </p>
          </div>
          <Link href="/app" className="btn-primary">
            New spec
          </Link>
        </div>

        {!projects?.length ? (
          <div className="panel mt-8 p-6">
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontSize: 32, marginBottom: 12, animation: 'ghost-float 3s ease-in-out infinite', display: 'inline-block' }}>◎</p>
              <p style={{ color: 'var(--text-2)', fontWeight: 510, marginBottom: 6 }}>No projects yet</p>
              <p style={{ color: 'var(--subdued)', fontSize: 14, marginBottom: 24 }}>Upload a screen recording to generate your first spec.</p>
              <a href="/app" className="btn-primary" style={{ padding: '10px 24px', borderRadius: 6, display: 'inline-block' }}>New project →</a>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {(projects as Project[]).map(p => (
              <Link
                key={p.id}
                href={`/app/projects/${p.id}`}
                className="panel-soft flex items-center justify-between gap-4 px-5 py-4 transition-colors"
                style={{ borderRadius: 16 }}
              >
                <div className="min-w-0">
                  <p className="truncate text-base" style={{ color: 'var(--text)', fontWeight: 510 }}>
                    {p.your_app_name || p.reference_app}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    Ref: {p.reference_app} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="text-xs mono px-3 py-1 rounded-full"
                  style={{
                    color: statusColor[p.status] || 'var(--violet)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
