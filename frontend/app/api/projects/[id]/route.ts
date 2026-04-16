import { NextRequest, NextResponse } from 'next/server'
import { PROJECT_BASE_SELECT } from '@/lib/project-columns'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { requireProjectAccess } from '@/lib/auth-project'

// Next.js 14 caches GET route-handler JSON responses unless the route opts out
// explicitly. The progress page polls this every 3s; without force-dynamic +
// Cache-Control: no-store, clients get a stale snapshot for minutes after the
// worker finishes, so the "complete" state never reaches the UI.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('t')
  const guard = await requireProjectAccess(params.id, token)
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const { data, error } = await makeSupabaseServer()
    .from('projects').select(PROJECT_BASE_SELECT).eq('id', params.id).single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
