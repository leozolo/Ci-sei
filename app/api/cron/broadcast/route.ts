import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { dispatchDueBroadcasts, readCronConfig } from '@/lib/push-server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Chiamato dal database (pg_cron + pg_net) quando una notifica programmata è
 * all'orario. Niente sessione: vale solo il codice segreto salvato in app_secrets.
 */
export async function POST(request: Request) {
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'missing_secret_key' }, { status: 503 })
  const config = await readCronConfig(admin)
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!config || !given || !sameSecret(given, config.token)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  try {
    const results = await dispatchDueBroadcasts(admin, new URL(request.url).origin)
    return NextResponse.json({ sent: results.length })
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}
