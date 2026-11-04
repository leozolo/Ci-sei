import { NextResponse } from 'next/server'
import { getVapidKeys } from '@/lib/push-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMember } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Chiave pubblica per iscrivere il dispositivo alle notifiche push. */
export async function GET() {
  const member = await getMember()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ publicKey: null, reason: 'missing_secret_key' })
  try {
    const { publicKey } = await getVapidKeys(admin)
    return NextResponse.json({ publicKey })
  } catch {
    return NextResponse.json({ publicKey: null, reason: 'error' })
  }
}
