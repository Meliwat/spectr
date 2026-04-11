import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { triggerWorker } from '@/lib/trigger-worker'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, mp4_s3_key, reference_app, your_app_name, brand_colors, logo_s3_key, bundle_id } = body

  if (!id || !mp4_s3_key || !reference_app) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('projects')
    .insert({ id, status: 'pending', mp4_s3_key, reference_app, your_app_name, brand_colors, logo_s3_key, bundle_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  triggerWorker(id)

  return NextResponse.json({ id })
}
