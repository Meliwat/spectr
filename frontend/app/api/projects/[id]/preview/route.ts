import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data } = await supabaseServer
    .from('projects').select('spec_md_text').eq('id', params.id).single()
  if (!data?.spec_md_text) return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  return NextResponse.json({ preview: data.spec_md_text.slice(0, 3000) })
}
