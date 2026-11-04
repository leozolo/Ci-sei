import { NextResponse, type NextRequest } from 'next/server'
import { parseLinkPreview } from '@/lib/link-preview'
import { decodeHtml, safeFetch } from '@/lib/safe-fetch'
import { getMember } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Legge una pagina evento esterna e restituisce titolo, data, luogo e immagine. */
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
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      maxBytes: 2_500_000,
      timeoutMs: 8000,
      truncate: true,
    })
    if (!res.ok || !/html|xml/i.test(res.contentType)) return NextResponse.json({ url: target.href })
    const preview = parseLinkPreview(decodeHtml(res.body, res.contentType), res.url)
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'private, max-age=600' } })
  } catch {
    return NextResponse.json({ url: target.href })
  }
}
