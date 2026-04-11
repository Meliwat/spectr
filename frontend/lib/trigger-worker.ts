export function triggerWorker(projectId: string): void {
  const workerUrl = process.env.WORKER_URL
  if (!workerUrl) return
  fetch(`${workerUrl}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': process.env.WORKER_WEBHOOK_SECRET || '',
    },
    body: JSON.stringify({ project_id: projectId }),
  }).catch(err => console.error('[worker trigger]', err))
}
