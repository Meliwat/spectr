import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { triggerWorker } from '@/lib/trigger-worker'
import { requireProjectOwner } from '@/lib/auth-project'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireProjectOwner(params.id)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  await makeSupabaseServer()
    .from('projects').update({ status: 'pending', error_text: null }).eq('id', params.id)

  await triggerWorker(params.id)

  return NextResponse.json({ ok: true })
}
