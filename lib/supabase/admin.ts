import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '@/lib/config'

/** Client con chiave segreta: solo lato server, per le notifiche push. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !key) return null
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
