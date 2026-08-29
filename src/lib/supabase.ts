import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { fetchWithTimeout } from './http'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // Without this an unreachable backend hangs every call indefinitely rather
  // than failing in a way the UI can report. See lib/http.ts.
  global: { fetch: fetchWithTimeout },
})
