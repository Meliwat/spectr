import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/auth-project'

const clean = (v: string | undefined) => (v ?? '').replace(/\\n/g, '').trim()

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('t')
  const guard = await requireProjectAccess(params.id, token)
  if (!guard.ok) return NextResponse.json({ lines: [] }, { status: guard.status })

  const workerUrl = clean(process.env.WORKER_URL)
  if (!workerUrl) {
    console.error('[logs route] WORKER_URL is not set')
    return NextResponse.json({ lines: [] })
  }

  try {
    const response = await fetch(`${workerUrl}/logs/${params.id}`, {
      headers: {
        'x-webhook-secret': clean(process.env.WORKER_WEBHOOK_SECRET),
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[logs route] worker responded ${response.status}: ${body.slice(0, 200)}`)
      return NextResponse.json({ lines: [] })
    }

    const data = await response.json()
    return NextResponse.json({ lines: Array.isArray(data?.lines) ? data.lines : [] })
  } catch (err) {
    console.error('[logs route] worker fetch failed:', err)
    return NextResponse.json({ lines: [] })
  }
}
