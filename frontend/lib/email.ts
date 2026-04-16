import { getEnv } from '@/lib/env'

/**
 * Sends a Resend email to the founder when a free-sample project is created.
 * Includes the exact CLI command to run for fulfillment.
 *
 * Non-blocking: errors are logged and swallowed. The user-facing flow does
 * not depend on email delivery.
 */
export async function sendFounderSampleNotification(args: {
  projectId: string
  userEmail: string | null | undefined
  referenceApp: string
}): Promise<void> {
  const apiKey = getEnv('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping founder notification')
    return
  }

  const fromAddress = getEnv('RESEND_FROM') || 'spectr <onboarding@resend.dev>'
  const founderEmail = 'muhammedeliwat@gmail.com'

  const cliCommand = `cd ~/spectr/worker && python local_worker.py --project-id ${args.projectId}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: founderEmail,
        subject: `New Spectr free sample — ${args.referenceApp}`,
        html: `
          <p><strong>User:</strong> ${args.userEmail ?? '(no email)'}</p>
          <p><strong>Reference app:</strong> ${args.referenceApp}</p>
          <p><strong>Project:</strong> ${args.projectId}</p>
          <p>Run locally:</p>
          <pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-family:monospace;">${cliCommand}</pre>
          <p><a href="https://www.spectr.to/admin">Admin dashboard →</a></p>
        `,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[email] founder notification failed:', res.status, text)
    }
  } catch (err) {
    console.error('[email] founder notification threw:', err)
  }
}
