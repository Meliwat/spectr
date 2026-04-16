import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { count, error } = await supabase
    .from('spec_credits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'available')

  if (error) {
    console.error('[billing/credits] query failed:', error.message)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  return NextResponse.json({ available: count ?? 0 })
}
