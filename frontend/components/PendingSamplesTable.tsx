import { makeSupabaseServer } from '@/lib/supabase-server'

interface ProjectRow {
  id: string
  reference_app: string
  created_at: string
  email: string | null
  user_id: string | null
  status: string
}

async function fetchRows(statuses: string[]): Promise<ProjectRow[]> {
  const admin = makeSupabaseServer()

  const { data: projects, error } = await admin
    .from('projects')
    .select('id, reference_app, created_at, user_id, email, status')
    .in('status', statuses)
    .order('created_at', { ascending: true })

  if (error || !projects) {
    console.error('[admin] pending fetch failed:', error?.message)
    return []
  }

  // Enrich with auth email for legacy rows (email column was added 2026-04-16;
  // older rows only have user_id). Still cheap at admin volumes.
  const enriched: ProjectRow[] = []
  for (const p of projects) {
    let email = p.email ?? null
    if (!email && p.user_id) {
      try {
        const { data } = await admin.auth.admin.getUserById(p.user_id)
        email = data.user?.email ?? null
      } catch {
        /* leave null */
      }
    }
    enriched.push({
      id: p.id,
      reference_app: p.reference_app,
      created_at: p.created_at,
      email,
      user_id: p.user_id ?? null,
      status: p.status,
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
  const samples = await fetchRows(['awaiting_manual_processing'])
  const paidPending = await fetchRows(['awaiting_payment'])

  return (
    <section className="panel-strong p-6 space-y-8">
      <div>
        <h2 className="text-xl" style={{ fontWeight: 510 }}>Pending free samples</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Run the CLI command to fulfill. Status flips away from
          <code style={{ margin: '0 4px' }}>awaiting_manual_processing</code>
          when the worker finishes.
        </p>

        {samples.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>No samples in the queue.</p>
        ) : (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th className="pb-2">Email</th>
                <th className="pb-2">Reference</th>
                <th className="pb-2">Age</th>
                <th className="pb-2">Command</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-3">{s.email ?? '(no email)'}</td>
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
        )}
      </div>

      <div>
        <h2 className="text-xl" style={{ fontWeight: 510 }}>Abandoned carts</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Users who started the paid flow but never completed Stripe Checkout.
        </p>

        {paidPending.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>None.</p>
        ) : (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th className="pb-2">Email</th>
                <th className="pb-2">Reference</th>
                <th className="pb-2">Age</th>
              </tr>
            </thead>
            <tbody>
              {paidPending.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-3">{s.email ?? '(no email)'}</td>
                  <td className="py-3">{s.reference_app}</td>
                  <td className="py-3">{ageString(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
