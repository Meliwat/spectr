import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEnv } from '@/lib/env'

/**
 * Server Supabase client scoped to the CURRENT user's session via cookies.
 *
 * Use this in Server Components and Route Handlers that need to query as the
 * signed-in user — RLS on `projects` will scope rows to `user_id = auth.uid()`.
 *
 * For admin/worker operations that must bypass RLS (signed URLs, writing logs,
 * worker triggers), use `makeSupabaseServer()` from `lib/supabase-server.ts`
 * instead — that uses the service-role key.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL') || 'https://placeholder.supabase.co',
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'placeholder',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — Next.js disallows writes here.
            // The middleware refreshes the session cookie on navigation, so
            // swallowing this write is safe.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // See note above.
          }
        },
      },
    },
  )
}
