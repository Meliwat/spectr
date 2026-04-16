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

  // Refresh the session so `getUser()` below is accurate and the client cookie
  // stays in sync.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only /app/* requires authentication. Landing (/), waitlist redirect,
  // progress view (/p/*), login, admin (query-key gated), and auth callback
  // are all public.
  if (pathname.startsWith('/app')) {
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
