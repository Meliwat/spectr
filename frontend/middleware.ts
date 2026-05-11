import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const clean = (v: string | undefined, fallback: string) =>
  (v ?? fallback).replace(/\\n/g, '').trim()

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build a response we can mutate cookies on. Supabase's SSR client needs to
  // be able to refresh the session cookie here so tokens stay fresh.
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://placeholder.supabase.co'),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'placeholder'),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    },
  )

  // Only /app/* requires authentication. Landing (/), gallery, progress view
  // (/p/*), login, admin (query-key gated), and auth callback are all public.
  // We deliberately skip the Supabase round-trip for those routes — a stale or
  // expired session cookie can make supabase.auth.getUser() hang long enough
  // to trip Vercel's MIDDLEWARE_INVOCATION_TIMEOUT (25s edge cap) and return
  // a 504 on the landing page. The session is still refreshed naturally on
  // any /app/* navigation below.
  if (pathname.startsWith('/app')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Skip middleware for Next internals + anything in /public/* that's a
    // static asset. Extension-based skip at the end covers files served
    // straight out of /public/ (demo videos, posters, OG images, etc.).
    '/((?!_next/static|_next/image|favicon.ico|brand/|icon.png|demo/|.*\\.(?:mp4|webm|mov|jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|otf)$).*)',
  ],
}
