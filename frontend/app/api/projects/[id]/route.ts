import { NextRequest, NextResponse } from 'next/server'
import { PROJECT_BASE_SELECT } from '@/lib/project-columns'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { requireProjectOwner } from '@/lib/auth-project'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireProjectOwner(params.id)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { data, error } = await makeSupabaseServer()
    .from('projects').select(PROJECT_BASE_SELECT).eq('id', params.id).single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
