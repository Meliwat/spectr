import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { requireProjectAccess } from '@/lib/auth-project'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('t')
  const guard = await requireProjectAccess(params.id, token)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { data } = await makeSupabaseServer()
    .from('projects').select('spec_md_text').eq('id', params.id).single()
  if (!data?.spec_md_text) return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  return NextResponse.json({ preview: data.spec_md_text.slice(0, 3000) })
}
