import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow /waitlist and all API routes through
  if (pathname === '/waitlist' || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Redirect everything else to /waitlist
  return NextResponse.redirect(new URL('/waitlist', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand/|icon.png).*)',
  ],
}
