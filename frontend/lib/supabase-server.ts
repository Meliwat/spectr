import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

export function makeSupabaseServer() {
  return createClient(
    getEnv('SUPABASE_URL') || 'https://placeholder.supabase.co',
    getEnv('SUPABASE_SERVICE_KEY') || 'placeholder',
  )
}

// Singleton for routes that import directly — initialized at request time in Next.js App Router
export const supabaseServer = makeSupabaseServer()
