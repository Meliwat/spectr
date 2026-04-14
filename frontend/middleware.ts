import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const clean = (v: string | undefined, fallback: string) =>
  (v ?? fallback).replace(/\\n/g, '').trim()

// Paths that never require auth. Everything else under /app/* will be checked.
const ALWAYS_PUBLIC = [
  '/waitlist',
  '/spectr-enter',
  '/admin',
  '/login',
  '/auth/callback',
]

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true
  if (ALWAYS_PUBLIC.some(p => pathname === p || pathname.startsWith(`${p}/`))) return true
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

  // Public paths pass through — but still with the cookie refreshed.
  if (isPublic(pathname)) {
    return response
  }

  // Everything else (including all of /app/*) requires a signed-in user.
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the target path so the login flow can bounce back to it.
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
