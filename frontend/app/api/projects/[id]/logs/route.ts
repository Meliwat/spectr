import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
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
