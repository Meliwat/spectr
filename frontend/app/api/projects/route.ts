import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { triggerWorker } from '@/lib/trigger-worker'
import { paywallEnabled } from '@/lib/paywall'
import { sendFounderSampleNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    id,
    mp4_s3_key,
    reference_app,
    your_app_name,
    brand_colors,
    logo_s3_key,
    bundle_id,
    mode: rawMode,
  } = body

  if (!id || !mp4_s3_key || !reference_app) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify the request comes from a signed-in user.
  const sessionClient = createSupabaseServerClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const mode: 'auto' | 'manual' = rawMode === 'sample' ? 'manual' : 'auto'
  const paywall = paywallEnabled()

  const admin = makeSupabaseServer()

  // ─── Auto path: consume one available credit if paywall is on ──────────
  let consumedCreditId: string | null = null
  if (mode === 'auto' && paywall) {
    // Step 1: find the oldest available credit.
    const { data: credit } = await admin
      .from('spec_credits')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!credit) {
      return NextResponse.json({ error: 'no_credits' }, { status: 402 })
    }

    // Step 2: atomically consume it (the status guard prevents double-spend).
    const { error: consumeErr } = await admin
      .from('spec_credits')
      .update({
        status: 'consumed',
        consumed_at: new Date().toISOString(),
      })
      .eq('id', credit.id)
      .eq('status', 'available')

    if (consumeErr) {
      console.error('[projects] credit consume failed:', consumeErr.message)
      return NextResponse.json({ error: 'credit_consume_failed' }, { status: 500 })
    }
    consumedCreditId = credit.id
  }

  // ─── Insert project row ─────────────────────────────────────────────────
  const { error: insertErr } = await admin.from('projects').insert({
    id,
    status: mode === 'manual' ? 'awaiting_manual_processing' : 'pending',
    processing_mode: mode,
    mp4_s3_key,
    reference_app,
    your_app_name,
    brand_colors,
    logo_s3_key,
    bundle_id,
    user_id: user.id,
  })

  if (insertErr) {
    // Refund the credit if we consumed one.
    if (consumedCreditId) {
      await admin
        .from('spec_credits')
        .update({ status: 'available', consumed_at: null, project_id: null })
        .eq('id', consumedCreditId)
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Link credit to project (best-effort, non-fatal).
  if (consumedCreditId) {
    await admin
      .from('spec_credits')
      .update({ project_id: id })
      .eq('id', consumedCreditId)
  }

  // ─── Branch on mode ─────────────────────────────────────────────────────
  if (mode === 'auto') {
    await triggerWorker(id)
  } else {
    // Free-sample path: notify founder, do NOT trigger worker.
    await sendFounderSampleNotification({
      projectId: id,
      userEmail: user.email,
      referenceApp: reference_app,
    })
  }

  return NextResponse.json({ id })
}
