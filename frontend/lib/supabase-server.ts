import { createClient } from '@supabase/supabase-js'

// getEnv() uses a variable key so Next.js/SWC cannot replace it at build time.
// Without this, encrypted Vercel env vars are undefined in the built bundle
// even though they're present in process.env at runtime.
function getEnv(key: string): string {
  return (process.env[key] ?? '').split('\n').join('').trim()
}

export function makeSupabaseServer() {
  return createClient(
    getEnv('SUPABASE_URL') || 'https://placeholder.supabase.co',
    getEnv('SUPABASE_SERVICE_KEY') || 'placeholder',
  )
}

// Singleton for routes that import directly — initialized at request time in Next.js App Router
export const supabaseServer = makeSupabaseServer()

