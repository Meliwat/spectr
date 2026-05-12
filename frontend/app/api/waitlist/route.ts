// frontend/app/api/waitlist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email, video_s3_key, video_filename } = await req.json()

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const normalised = email.trim().toLowerCase()

  const { error } = await supabaseServer
    .from('waitlist')
    .insert({
      email:          normalised,
      video_s3_key:   video_s3_key  ?? null,
      video_filename: video_filename ?? null,
    })

  if (error) {
    if (error.code === '23505') {
      // Duplicate email — treat as success (don't leak membership)
      return NextResponse.json({ ok: true })
    }
    console.error('[waitlist] insert error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  // Fire Resend notification — non-blocking, never fails the request
  const adminUrl =
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spectr.to'}` +
    `/admin?key=${process.env.ADMIN_SECRET ?? ''}`

  // `from` is env-driven so we can flip from the Resend sandbox to hello@spectr.to
  // the moment DNS verifies, without a redeploy.
  const fromAddress = (process.env.RESEND_FROM ?? 'spectr <onboarding@resend.dev>').trim()
  const founderEmail = (process.env.FOUNDER_EMAIL ?? 'hello@spectr.to').trim()

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    fromAddress,
      to:      founderEmail,
      subject: `🎬 New blueprint request — ${normalised}`,
      html: [
        `<p><strong>${normalised}</strong> just submitted a video.</p>`,
        `<p>File: ${video_filename ?? '(no file)'}</p>`,
        `<p><a href="${adminUrl}">View in admin →</a></p>`,
      ].join(''),
    }),
  }).catch(err => console.error('[resend] notification failed:', err))

  return NextResponse.json({ ok: true })
}
