import { NextResponse } from 'next/server'
import { makeSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Vercel Cron hits this endpoint to keep the Supabase free-tier project from
// auto-pausing after 7 days of inactivity. Any single DB query against a real
// table is enough — touching projects costs nothing and proves end-to-end that
// the connection + RLS + service key are still working.
//
// Cron schedule lives in frontend/vercel.json — twice a week (Mon + Thu noon
// UTC) so a single failed run still leaves margin before the 7-day threshold.

export async function GET() {
  try {
    const supabase = makeSupabaseServer()
    const { error } = await supabase.from('projects').select('id').limit(1)
    if (error) throw error
    return NextResponse.json(
      { ok: true, pinged_at: new Date().toISOString() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err: any) {
    console.error('[keep-alive] supabase ping failed:', err?.message ?? err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'unknown', pinged_at: new Date().toISOString() },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
