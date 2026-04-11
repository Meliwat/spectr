import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { triggerWorker } from '@/lib/trigger-worker'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  await supabaseServer
    .from('projects').update({ status: 'pending', error_text: null }).eq('id', params.id)

  triggerWorker(params.id)

  return NextResponse.json({ ok: true })
}
