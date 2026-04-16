import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'

export const dynamic = 'force-dynamic'

/**
 * Magic-link callback.
 *
 * Supabase redirects here with `?code=...` after the user clicks the email
 * link. We exchange the code for a session cookie, then bounce them to the
 * original destination (`?next=` param) or `/app`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/app'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const redirect = new URL('/login', url.origin)
    redirect.searchParams.set('error', error.message || 'exchange_failed')
    return NextResponse.redirect(redirect)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
