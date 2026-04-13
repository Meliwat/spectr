import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('waitlist')
    .insert({ email: email.trim().toLowerCase() })

  if (error) {
    if (error.code === '23505') {
      // Already on the list — treat as success so we don't leak whether an email is registered
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
