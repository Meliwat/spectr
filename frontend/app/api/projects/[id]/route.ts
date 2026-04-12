import { NextRequest, NextResponse } from 'next/server'
import { PROJECT_BASE_SELECT } from '@/lib/project-columns'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseServer
    .from('projects').select(PROJECT_BASE_SELECT).eq('id', params.id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
