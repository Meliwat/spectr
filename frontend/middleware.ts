import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const clean = (v: string | undefined, fallback: string) =>
  (v ?? fallback).replace(/\\n/g, '').trim()

// Paths that bypass BOTH the waitlist gate and the auth check. These must
// remain reachable without the access cookie so anyone can sign up, so the
// admin can check submissions, and so the access-cookie setter itself works.
const UNGATED = [
  '/waitlist',
  '/spectr-enter',
  '/admin',
  '/auth/callback',
]

function isUngated(pathname: string): boolean {
  if (UNGATED.some(p => pathname === p || pathname.startsWith(`${p}/`))) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/_next/')) return true
  return false
}

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

  // Ungated paths (waitlist, admin, spectr-enter, auth callback, api, assets)
  // pass straight through — but still with the cookie refreshed.
  if (isUngated(pathname)) {
    return response
  }

  // Everything else is behind the pre-launch waitlist gate. The /spectr-enter
  // route sets `spectr_access=main` for 30 days; without that cookie the visit
  // is redirected to /waitlist so non-invited traffic never sees the product.
  const hasAccess = request.cookies.get('spectr_access')?.value === 'main'
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/waitlist', request.url))
  }

  // Gated paths that require a signed-in user: everything under /app/*.
  // /login is accessible to invited visitors who don't yet have a session.
  if (pathname === '/login' || pathname === '/') {
    return response
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/login') loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
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
