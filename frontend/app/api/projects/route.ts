import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { triggerWorker } from '@/lib/trigger-worker'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, mp4_s3_key, reference_app, your_app_name, brand_colors, logo_s3_key, bundle_id } = body

  if (!id || !mp4_s3_key || !reference_app) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify the request comes from a signed-in user.
  const sessionClient = createSupabaseServerClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use the service-role client for the actual write — we need to stamp the
  // row with user_id so RLS will expose it to this user on subsequent reads,
  // and we want the insert to succeed regardless of policy wording.
  const admin = makeSupabaseServer()
  const { error } = await admin
    .from('projects')
    .insert({
      id,
      status: 'pending',
      mp4_s3_key,
      reference_app,
      your_app_name,
      brand_colors,
      logo_s3_key,
      bundle_id,
      user_id: user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await triggerWorker(id)

  return NextResponse.json({ id })
}
