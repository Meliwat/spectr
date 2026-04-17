import type { Metadata } from 'next'
import AdminTable, { AdminRow } from './AdminTable'
import PendingSamplesTable from '@/components/PendingSamplesTable'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
}

// getEnv uses a variable key so SWC cannot replace it at build time
function getEnv(key: string): string {
  return (process.env[key] ?? '').split('\n').join('').trim()
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  const adminSecret = getEnv('ADMIN_SECRET')

  if (!searchParams.key || searchParams.key !== adminSecret) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#07080f', minHeight: '100vh', color: '#fff' }}>
        <h1 style={{ color: '#ff4444' }}>403 Forbidden</h1>
        <p style={{ color: '#888' }}>Invalid or missing admin key.</p>
      </div>
    )
  }

  // Query Supabase directly — avoid internal Next.js fetch loopback
  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceKey  = getEnv('SUPABASE_SERVICE_KEY')

  const res = await fetch(
    `${supabaseUrl}/rest/v1/waitlist?select=id,email,video_s3_key,video_filename,status,created_at&order=created_at.desc`,
    {
      headers: {
        apikey:          serviceKey,
        Authorization:   `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText)
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#07080f', minHeight: '100vh', color: '#ff4444' }}>
        Supabase error {res.status}: {txt}
      </div>
    )
  }

  type RawRow = { id: string; email: string; video_s3_key: string | null; video_filename: string | null; status: string; created_at: string }
  const data: RawRow[] = await res.json()

  // Generate signed URLs for rows that have a video
  const rows: AdminRow[] = await Promise.all(
    data.map(async (row) => {
      let downloadUrl: string | null = null
      if (row.video_s3_key) {
        try {
          const signRes = await fetch(
            `${supabaseUrl}/storage/v1/object/sign/waitlist-videos/${row.video_s3_key}`,
            {
              method: 'POST',
              headers: {
                apikey:         serviceKey,
                Authorization:  `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ expiresIn: 3600 }),
            }
          )
          if (signRes.ok) {
            const json = await signRes.json()
            if (json.signedURL) {
              downloadUrl = `${supabaseUrl}/storage/v1${json.signedURL}`
            }
          }
        } catch {
          // signed URL failed — row still shown, just no download link
        }
      }
      return { id: row.id, email: row.email, video_filename: row.video_filename, downloadUrl, status: row.status, created_at: row.created_at }
    })
  )

  return (
    <>
      <div style={{ background: '#07080f', padding: '32px 32px 0' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <PendingSamplesTable />
        </div>
      </div>
      <AdminTable rows={rows} adminKey={searchParams.key} />
    </>
  )
}
