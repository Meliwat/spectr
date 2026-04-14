import { createBrowserClient } from '@supabase/ssr'

const clean = (v: string | undefined, fallback: string) =>
  (v ?? fallback).replace(/\\n/g, '').trim()

/**
 * Browser Supabase client with cookie-based session persistence.
 *
 * Use this in Client Components that need to talk to Supabase on behalf of the
 * signed-in user — including Realtime subscriptions, which rely on the user's
 * JWT to satisfy RLS policies on the `projects` table.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://placeholder.supabase.co'),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'placeholder'),
  )
}
