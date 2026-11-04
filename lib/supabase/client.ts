import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config'

let client: SupabaseClient | undefined

/** Client Supabase del browser (creato al primo uso, mai durante il rendering sul server). */
export function sb(): SupabaseClient {
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  return client
}
