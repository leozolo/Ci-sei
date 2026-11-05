'use client'

import Link from 'next/link'
import { LuChevronRight } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { PageBody, PageHeader } from '@/components/page-header'
import { fmt } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'

export default function MembersPage() {
  const { members, me } = useApp()
  const { m: t } = useI18n()
  const active = members.filter((m) => m.status === 'active')

  return (
    <main>
      <PageHeader back title={fmt(t.members.title, { n: active.length })} />
      <PageBody>
        <ul className="divide-y divide-line rounded-[16px] border border-line bg-elev px-4">
          {active.map((m) => (
            <li key={m.id}>
              <Link href={`/u/${m.id}`} className="flex items-center gap-3 py-3">
                <Avatar person={m} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-list text-[18px] font-bold uppercase">
                    {m.display_name}
                    {m.id === me.id ? <span className="font-sans text-[13px] font-normal normal-case text-muted"> ({t.common.you})</span> : null}
                  </span>
                  {m.role === 'admin' ? <span className="block text-[12px] text-muted">{t.members.admin}</span> : null}
                </span>
                <LuChevronRight className="size-5 text-faint" />
              </Link>
            </li>
          ))}
        </ul>
        {me.role === 'admin' ? (
          <p className="mt-4 text-center text-[14px] text-muted">
            {t.members.inviteHint}{' '}
            <Link href="/admin" className="font-semibold text-fg underline underline-offset-4">
              {t.admin.title}
            </Link>
          </p>
        ) : null}
      </PageBody>
    </main>
  )
}
