import { NextRequest, NextResponse } from 'next/server'
import { requireProjectOwner } from '@/lib/auth-project'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireProjectOwner(params.id)
  if (!guard.ok) return NextResponse.json({ lines: [] }, { status: guard.status })

  const workerUrl = process.env.WORKER_URL
  if (!workerUrl) {
    return NextResponse.json({ lines: [] })
  }

  try {
    const response = await fetch(`${workerUrl}/logs/${params.id}`, {
      headers: {
        'x-webhook-secret': process.env.WORKER_WEBHOOK_SECRET || '',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ lines: [] })
    }

    const data = await response.json()
    return NextResponse.json({ lines: Array.isArray(data?.lines) ? data.lines : [] })
  } catch {
    return NextResponse.json({ lines: [] })
  }
}
