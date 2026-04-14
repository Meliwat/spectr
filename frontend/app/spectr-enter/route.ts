import { NextRequest, NextResponse } from 'next/server'

function resolveDestination(rawDestination: string | null) {
  if (!rawDestination) return '/app'
  if (!rawDestination.startsWith('/')) return '/app'
  if (rawDestination.startsWith('//')) return '/app'
  return rawDestination
}

export function GET(request: NextRequest) {
  const destination = resolveDestination(request.nextUrl.searchParams.get('to'))
  const response = NextResponse.redirect(new URL(destination, request.url))

  response.cookies.set({
    name: 'spectr_access',
    value: 'v2',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
