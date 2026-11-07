import { NextResponse } from 'next/server'
import { broadcastReach, dispatchDueBroadcasts, ensureCronConfig, productionOrigin } from '@/lib/push-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMember } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** Solo un amministratore attivo (controllo lato server, oltre a quello del database). */
async function isAdmin(): Promise<boolean> {
  const member = await getMember()
  return member?.profile.role === 'admin'
}

/** Quante persone riceveranno la notifica; prepara gli invii programmati. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Solo un amministratore' }, { status: 403 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'missing_secret_key' }, { status: 503 })
  try {
    await ensureCronConfig(admin, `${productionOrigin(request)}/api/cron/broadcast`)
    return NextResponse.json(await broadcastReach(admin))
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}

/** «Invia a tutti»: spedisce subito le notifiche arrivate all'orario. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Solo un amministratore' }, { status: 403 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'missing_secret_key' }, { status: 503 })
  try {
    const results = await dispatchDueBroadcasts(admin, new URL(request.url).origin)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}
