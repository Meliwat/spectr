import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; sent?: string; error?: string }
}) {
  // If already signed in, bounce to the app.
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(searchParams.next || '/app')
  }

  return (
    <LoginClient
      next={searchParams.next}
      sent={searchParams.sent === '1'}
      error={searchParams.error}
    />
  )
}
