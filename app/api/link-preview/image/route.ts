import { NextResponse, type NextRequest } from 'next/server'
import { safeFetch } from '@/lib/safe-fetch'
import { getMember } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED = /^image\/(jpeg|png|webp|gif|avif)/i

/** Scarica la locandina trovata nel link, così si può caricare nell'app. */
export async function GET(request: NextRequest) {
  const member = await getMember()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  let target: URL
  try {
    target = new URL(request.nextUrl.searchParams.get('url') ?? '')
  } catch {
    return NextResponse.json({ error: 'Link non valido' }, { status: 400 })
  }

  try {
    const res = await safeFetch(target, {
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
      maxBytes: 10 * 1024 * 1024,
      timeoutMs: 10000,
      truncate: false,
    })
    const type = res.contentType.split(';')[0].trim()
    if (!res.ok || !ALLOWED.test(type)) return NextResponse.json({ error: 'Immagine non disponibile' }, { status: 422 })
    return new Response(new Blob([new Uint8Array(res.body)], { type }), {
      headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Immagine non disponibile' }, { status: 422 })
  }
}
