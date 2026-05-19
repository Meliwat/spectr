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
 * Delivers a purchased per-app spec pack to the buyer as a download LINK
 * (not attachments). The link points at the gallery success page, which
 * re-verifies the Stripe session and mints fresh signed URLs on every
 * visit — so it never expires even though individual signed URLs are short
 * lived.
 *
 * Link-based + multipart (html AND text) deliberately: file attachments
 * from a low-reputation domain and HTML-only bodies are strong spam
 * signals. This keeps it transactional and inbox-friendly.
 *
 * Returns true only if Resend accepted the send. The caller logs failures
 * but does NOT retry — the same success page is the in-product fallback,
 * so a missed email never means a lost purchase.
 */
export async function sendSpecDelivery(args: {
  to: string
  productName: string
  downloadUrl: string
}): Promise<boolean> {
  const apiKey = getEnv('RESEND_API_KEY')
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not set — cannot deliver to', args.to)
    return false
  }

  const fromAddress = getEnv('RESEND_FROM') || 'spectr <onboarding@resend.dev>'
  const { productName, downloadUrl } = args

  const text =
    `Thanks for your purchase.\n\n` +
    `Your ${productName} is ready. Download here:\n${downloadUrl}\n\n` +
    `Production-ready DESIGN.md specs (SwiftUI / Expo / Android / ` +
    `framework-neutral): screen-by-screen documentation, full design system, ` +
    `and an implementation prompt for AI coding agents like Claude Code.\n\n` +
    `This link stays valid — open it any time to re-download.\n\n— Spectr`

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
  <p>Thanks for your purchase.</p>
  <p>Your <strong>${productName}</strong> is ready — production-ready DESIGN.md specs (SwiftUI / Expo / Android / framework-neutral) with screen-by-screen documentation, the full design system, and an implementation prompt for AI coding agents.</p>
  <p style="margin:28px 0;">
    <a href="${downloadUrl}" style="background:#111;color:#fff;text-decoration:none;padding:13px 26px;border-radius:8px;font-weight:600;display:inline-block;">Download ${productName}</a>
  </p>
  <p style="font-size:13px;color:#666;">Or paste this into your browser:<br><a href="${downloadUrl}" style="color:#555;">${downloadUrl}</a></p>
  <p style="font-size:13px;color:#666;">This link stays valid — open it any time to re-download.</p>
  <p style="font-size:13px;color:#999;">— Spectr</p>
</div>`

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
        subject: `Your ${productName} from Spectr`,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[email] spec delivery failed:', res.status, body)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] spec delivery threw:', err)
    return false
  }
}
