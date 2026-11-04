import { NextResponse } from 'next/server'
import { dispatchPendingPush } from '@/lib/push-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMember } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

/** Spedisce sui telefoni le notifiche appena create (chiamato dall'app dopo ogni azione). */
export async function POST(request: Request) {
  const member = await getMember()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ sent: 0, reason: 'missing_secret_key' })
  try {
    const sent = await dispatchPendingPush(admin, new URL(request.url).origin)
    return NextResponse.json({ sent })
  } catch {
    return NextResponse.json({ sent: 0, reason: 'error' }, { status: 500 })
  }
}
