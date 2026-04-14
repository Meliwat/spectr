import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'

// getEnv uses a variable key so SWC cannot replace it at build time
function getEnv(key: string): string {
  return (process.env[key] ?? '').split('\n').join('').trim()
}

export async function GET(req: NextRequest) {
  const qkey = req.nextUrl.searchParams.get('key')
  const secret = getEnv('ADMIN_SECRET')
  if (!qkey || qkey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = makeSupabaseServer()
  const { data, error } = await client
    .from('waitlist')
    .select('id, email, video_s3_key, video_filename, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    const rawFromEnv = process.env['SUPABASE_SERVICE_KEY']
    return NextResponse.json({
      error: error.message,
      version: 'v7-variable-key',
      debug: {
        getenv_result_len: getEnv('SUPABASE_SERVICE_KEY').length,
        raw_typeof: typeof rawFromEnv,
        raw_len: rawFromEnv?.length ?? -1,
        url: getEnv('SUPABASE_URL').slice(0, 30),
      },
    }, { status: 500 })
  }

  const rows = await Promise.all(
    data.map(async (row: { id: string; email: string; video_s3_key: string | null; video_filename: string | null; status: string; created_at: string }) => {
      let downloadUrl: string | null = null
      if (row.video_s3_key) {
        const { data: urlData } = await client.storage
          .from('waitlist-videos')
          .createSignedUrl(row.video_s3_key, 3600)
        downloadUrl = urlData?.signedUrl ?? null
      }
      return { ...row, downloadUrl }
    })
  )

  return NextResponse.json(rows)
}
