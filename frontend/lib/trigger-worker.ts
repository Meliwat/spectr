export async function triggerWorker(projectId: string): Promise<void> {
  const workerUrl = (process.env.WORKER_URL ?? '').replace(/\\n/g, '').trim()
  const secret = (process.env.WORKER_WEBHOOK_SECRET ?? '').replace(/\\n/g, '').trim()
  if (!workerUrl) {
    console.error('[worker trigger] WORKER_URL is not set')
    return
  }
  try {
    const res = await fetch(`${workerUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify({ project_id: projectId }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[worker trigger] non-2xx ${res.status}: ${body.slice(0, 200)}`)
    }
  } catch (err) {
    console.error('[worker trigger] fetch failed:', err)
  }
}
