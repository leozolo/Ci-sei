import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config'

/** Client Supabase per route handler: usa la sessione dell'utente salvata nei cookie. */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // chiamato da un Server Component: il proxy aggiorna i cookie al posto nostro
        }
      },
    },
  })
}

/** Restituisce l'utente solo se è un membro attivo del gruppo. */
export async function getMember() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role, status')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.status !== 'active') return null
  return { supabase, user, profile }
}
