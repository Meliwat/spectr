import { NextRequest, NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key || key !== (process.env['ADMIN_SECRET'] ?? '').split('\n').join('').trim()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await makeSupabaseServer()
    .from('waitlist')
    .update({ status: 'fulfilled' })
    .eq('id', id)

  if (error) {
    console.error('[fulfill] update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
