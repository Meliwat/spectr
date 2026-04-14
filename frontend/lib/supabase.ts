// Browser Supabase client — auth-aware via cookies.
//
// This is the default client used by Client Components, including Realtime
// subscriptions. It reads the Supabase session from cookies so queries and
// channels run under the signed-in user (which RLS policies depend on).
//
// For server-side (route handlers, server components) use:
//   - lib/supabase-ssr.ts      — scoped to user's session (respects RLS)
//   - lib/supabase-server.ts   — service-role (bypasses RLS, admin ops only)

import { createSupabaseBrowserClient } from './supabase-browser'

export const supabase = createSupabaseBrowserClient()
