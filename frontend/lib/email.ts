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
  const founderEmail = getEnv('FOUNDER_EMAIL') || 'hello@spectr.to'

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

/**
 * Delivers a purchased per-app spec pack to the buyer as Resend attachments.
 *
 * Returns true only if Resend accepted the send. The caller (billing webhook)
 * logs failures but does NOT retry — the gallery success page exposes a
 * signed-URL download for the same files as the spam-folder fallback, so a
 * missed email never means a lost purchase.
 */
export async function sendSpecDelivery(args: {
  to: string
  appName: string
  files: { filename: string; content: Buffer }[]
}): Promise<boolean> {
  const apiKey = getEnv('RESEND_API_KEY')
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not set — cannot deliver spec to', args.to)
    return false
  }
  if (args.files.length === 0) {
    console.error('[email] sendSpecDelivery called with no files for', args.appName)
    return false
  }

  const fromAddress = getEnv('RESEND_FROM') || 'spectr <onboarding@resend.dev>'
  const fileList = args.files
    .map((f) => `<li style="font-family:monospace;">${f.filename}</li>`)
    .join('')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: args.to,
        subject: `Your ${args.appName} design spec from Spectr`,
        html: `
          <p>Thanks for your purchase — your <strong>${args.appName}</strong> design blueprint is attached.</p>
          <p>Included:</p>
          <ul>${fileList}</ul>
          <p>Each file is a production-ready DESIGN.md: screen-by-screen
          documentation, full design system, and an implementation prompt for
          AI coding agents like Claude Code. Drop it into your project and build.</p>
          <p style="color:#666;font-size:13px;">Didn't get the attachments? Reopen the
          gallery page you bought from — there's a direct download there too.</p>
        `,
        attachments: args.files.map((f) => ({
          filename: f.filename,
          content: f.content.toString('base64'),
        })),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[email] spec delivery failed:', res.status, text)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] spec delivery threw:', err)
    return false
  }
}
