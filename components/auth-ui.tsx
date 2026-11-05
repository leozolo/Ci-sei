'use client'

import type { ReactNode } from 'react'
import { Mark, Wordmark } from '@/components/brand'
import { LanguageSelect } from '@/components/language-select'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/react'
import { sb } from '@/lib/supabase/client'

/** Impaginazione comune delle schermate di accesso. */
export function AuthScreen({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <main className="pt-safe pb-safe relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      {/* la lingua si sceglie anche prima di avere un account */}
      <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)]">
        <LanguageSelect pending />
      </div>
      <div className="mb-8 flex flex-col items-center text-center">
        <Mark size={56} />
        <Wordmark className="mt-3 text-[32px]" />
        {subtitle ? <p className="mt-2 max-w-xs text-balance text-[15px] text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </main>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const cls =
    tone === 'error' ? 'bg-no/10 text-no' : tone === 'success' ? 'bg-going/10 text-going' : 'border border-line bg-elev text-fg'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[12px] px-4 py-3 text-[14px] font-medium ${cls}`}>
      {children}
    </p>
  )
}

export function GoogleButton({ next, label }: { next: string; label?: string }) {
  const { m } = useI18n()
  const start = async () => {
    await sb().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
  }
  return (
    <Button variant="outline" size="lg" className="w-full" onClick={() => void start()}>
      {label ?? m.auth.continueGoogle}
    </Button>
  )
}

export function OrDivider() {
  const { m } = useI18n()
  return (
    <div className="my-5 flex items-center gap-3 text-[13px] text-faint" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      {m.auth.or}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
