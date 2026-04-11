import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data } = await supabaseServer
    .from('projects').select('spec_md_s3_key, status').eq('id', params.id).single()

  if (!data || data.status !== 'complete' || !data.spec_md_s3_key) {
    return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  }

  const { data: signed } = await supabaseServer
    .storage.from('spectr-uploads').createSignedUrl(data.spec_md_s3_key, 86400)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
