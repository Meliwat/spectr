import { makeSupabaseServer } from '@/lib/supabase-server'

interface PendingSample {
  id: string
  reference_app: string
  created_at: string
  user_email: string | null
}

async function fetchPendingSamples(): Promise<PendingSample[]> {
  const admin = makeSupabaseServer()

  const { data: projects, error } = await admin
    .from('projects')
    .select('id, reference_app, created_at, user_id')
    .eq('processing_mode', 'manual')
    .eq('status', 'awaiting_manual_processing')
    .order('created_at', { ascending: true })

  if (error || !projects) {
    console.error('[admin] pending samples fetch failed:', error?.message)
    return []
  }

  // Look up user emails in a single batch via auth admin.
  const enriched: PendingSample[] = []
  for (const p of projects) {
    let email: string | null = null
    try {
      const { data } = await admin.auth.admin.getUserById(p.user_id)
      email = data.user?.email ?? null
    } catch {
      email = null
    }
    enriched.push({
      id: p.id,
      reference_app: p.reference_app,
      created_at: p.created_at,
      user_email: email,
    })
  }

  return enriched
}

function ageString(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return `${Math.floor(ms / 60_000)}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default async function PendingSamplesTable() {
  const samples = await fetchPendingSamples()

  if (samples.length === 0) {
    return (
      <section className="panel-strong p-6">
        <h2 className="text-xl" style={{ fontWeight: 510 }}>Pending free samples</h2>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
          No samples in the queue.
        </p>
      </section>
    )
  }

  return (
    <section className="panel-strong p-6">
      <h2 className="text-xl" style={{ fontWeight: 510 }}>Pending free samples</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
        Run the CLI command to fulfill. Status flips to <code>complete</code> when done; the user gets an email.
      </p>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
            <th className="pb-2">User</th>
            <th className="pb-2">Reference</th>
            <th className="pb-2">Age</th>
            <th className="pb-2">Command</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td className="py-3">{s.user_email ?? '(no email)'}</td>
              <td className="py-3">{s.reference_app}</td>
              <td className="py-3">{ageString(s.created_at)}</td>
              <td className="py-3">
                <code style={{ fontSize: 12, background: 'var(--surface)', padding: '4px 8px', borderRadius: 4 }}>
                  python local_worker.py --project-id {s.id}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
