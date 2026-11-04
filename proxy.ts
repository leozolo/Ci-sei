import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Proxy (ex middleware): mantiene viva la sessione e tiene fuori chi non ha
 * fatto l'accesso. I dati restano comunque protetti dal database (RLS).
 */

const PUBLIC_PATHS = ['/login', '/invito', '/auth', '/reimposta-password']

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers?: Record<string, string>) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        if (headers) for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

  if (!signedIn && !isPublic) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    login.search = path === '/' ? '' : `?next=${encodeURIComponent(path + request.nextUrl.search)}`
    const redirect = NextResponse.redirect(login)
    for (const c of response.cookies.getAll()) redirect.cookies.set(c)
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|js|css|woff2?)$).*)',
  ],
}
