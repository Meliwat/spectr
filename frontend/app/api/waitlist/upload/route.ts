import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const MAX_BYTES = 500 * 1024 * 1024 // 500 MB

export async function POST(req: NextRequest) {
  const { filename, size } = await req.json()

  if (
    !filename ||
    typeof filename !== 'string' ||
    !filename.toLowerCase().endsWith('.mp4')
  ) {
    return NextResponse.json({ error: 'Only .mp4 files are accepted' }, { status: 400 })
  }

  if (typeof size === 'number' && size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 413 })
  }

  // Sanitise filename and prepend UUID to prevent collisions
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key  = `${crypto.randomUUID()}-${safe}`

  const { data, error } = await supabaseServer.storage
    .from('waitlist-videos')
    .createSignedUploadUrl(key)

  if (error || !data) {
    console.error('[upload] signed URL error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Return key + token; client calls supabase.storage.uploadToSignedUrl()
  return NextResponse.json({ key, filename: safe, token: data.token })
}
