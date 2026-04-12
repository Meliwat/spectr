import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data } = await supabaseServer
    .from('projects')
    .select('spec_md_s3_key, bundle_s3_key, status')
    .eq('id', params.id)
    .single()

  if (!data || data.status !== 'complete') {
    return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  }

  // Prefer spec.md for the restored spec workflow; fall back to bundle.zip for older mobile runs
  const storageKey = data.spec_md_s3_key || data.bundle_s3_key
  const filename = data.spec_md_s3_key ? 'spec.md' : 'bundle.zip'

  if (!storageKey) {
    return NextResponse.json({ error: 'No download available' }, { status: 404 })
  }

  const { data: file, error } = await supabaseServer
    .storage.from('spectr-uploads').download(storageKey)

  if (error || !file) {
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }

  const contentType = file.type || (filename.endsWith('.md') ? 'text/markdown; charset=utf-8' : 'application/zip')

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
