import { createClient } from '@supabase/supabase-js'

export const supabaseServer = createClient(
  process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_KEY ?? 'placeholder'
)
