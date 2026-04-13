import { supabaseServer } from '@/lib/supabase-server'
import AdminTable, { AdminRow } from './AdminTable'

type RawRow = {
  id:             string
  email:          string
  video_s3_key:   string | null
  video_filename: string | null
  status:         string
  created_at:     string
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  // Auth check
  if (!searchParams.key || searchParams.key !== process.env.ADMIN_SECRET) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#07080f', minHeight: '100vh', color: '#fff' }}>
        <h1 style={{ color: '#ff4444' }}>403 Forbidden</h1>
        <p style={{ color: '#888' }}>Invalid or missing admin key.</p>
      </div>
    )
  }

  const { data, error } = await supabaseServer
    .from('waitlist')
    .select('id, email, video_s3_key, video_filename, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#07080f', minHeight: '100vh', color: '#ff4444' }}>
        Failed to load: {error.message}
      </div>
    )
  }

  // Generate 1-hour signed download URLs for each video
  const rows: AdminRow[] = await Promise.all(
    (data as RawRow[]).map(async row => {
      let downloadUrl: string | null = null
      if (row.video_s3_key) {
        const { data: urlData } = await supabaseServer.storage
          .from('waitlist-videos')
          .createSignedUrl(row.video_s3_key, 3600)
        downloadUrl = urlData?.signedUrl ?? null
      }
      return {
        id:             row.id,
        email:          row.email,
        video_filename: row.video_filename,
        downloadUrl,
        status:         row.status,
        created_at:     row.created_at,
      }
    })
  )

  return <AdminTable rows={rows} adminKey={searchParams.key} />
}
