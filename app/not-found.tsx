'use client'

import Link from 'next/link'
import { Mark } from '@/components/brand'
import { useI18n } from '@/lib/i18n/react'

export default function NotFound() {
  const { m } = useI18n()
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <Mark size={56} />
      <h1 className="font-list text-[27px] font-extrabold leading-tight">{m.notFound.title}</h1>
      <p className="text-[15px] text-muted">{m.notFound.body}</p>
      <Link href="/" className="font-semibold underline underline-offset-4">
        {m.event.backToBoard}
      </Link>
    </main>
  )
}
