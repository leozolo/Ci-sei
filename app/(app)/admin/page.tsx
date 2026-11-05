'use client'

import { useMemo, useState } from 'react'
import { LuCopy, LuMessageCircle, LuShieldCheck, LuUserMinus, LuUserPlus } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { Chip } from '@/components/filters'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { Button, buttonClass } from '@/components/ui/button'
import { confirmDialog, toast } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { createInvite, errorMessage, revokeInvite, setMemberRole, setMemberStatus } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/config'
import { relativeTime } from '@/lib/format'
import { fmt, intlLocale, msgs, plural } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { invalidate, useQuery } from '@/lib/query'
import { whatsappUrl } from '@/lib/share'
import { sb } from '@/lib/supabase/client'
import type { AdminMember, InviteRow } from '@/lib/types'

const USES = [1, 5, 10, 25]
const VALIDITY: (number | null)[] = [1, 7, 30, null]

const inviteLink = (code: string) => `${window.location.origin}/invito/${code}`
const inviteMessage = (code: string) => fmt(msgs().admin.inviteMessage, { app: APP_NAME, link: inviteLink(code) })

function isActive(i: InviteRow) {
  return !i.revoked_at && (!i.expires_at || new Date(i.expires_at) > new Date()) && i.uses < i.max_uses
}

async function fetchInvites(): Promise<InviteRow[]> {
  const { data, error } = await sb().from('invites').select('*').order('created_at', { ascending: false }).limit(60)
  if (error) throw error
  return (data ?? []) as InviteRow[]
}

async function fetchAdminMembers(): Promise<AdminMember[]> {
  const { data, error } = await sb().rpc('admin_list_members')
  if (error) throw error
  return (data ?? []) as AdminMember[]
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(msgs().actions.linkCopied)
  } catch {
    toast.error(msgs().admin.copyFailed)
  }
}

function InviteActions({ code }: { code: string }) {
  const { m } = useI18n()
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={whatsappUrl(inviteMessage(code))} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm')}>
        <LuMessageCircle className="size-4" /> {m.admin.sendWhatsapp}
      </a>
      <Button size="sm" variant="outline" icon={<LuCopy className="size-4" />} onClick={() => void copy(inviteLink(code))}>
        {m.admin.copyLink}
      </Button>
    </div>
  )
}

function AdminContent() {
  const { me } = useApp()
  const { m: t } = useI18n()
  const invites = useQuery(['admin', 'invites', me.id], fetchInvites)
  const members = useQuery(['admin', 'members', me.id], fetchAdminMembers)
  const [uses, setUses] = useState(1)
  const [days, setDays] = useState<number | null>(7)
  const [creating, setCreating] = useState(false)
  const [justCreated, setJustCreated] = useState<InviteRow | null>(null)
  const [selected, setSelected] = useState<AdminMember | null>(null)
  const [busy, setBusy] = useState(false)

  const active = useMemo(() => (invites.data ?? []).filter(isActive), [invites.data])
  const people = members.data ?? []

  const create = async () => {
    setCreating(true)
    try {
      const invite = await createInvite(uses, days)
      setJustCreated(invite)
      invalidate((k) => k[0] === 'admin' && k[1] === 'invites')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (i: InviteRow) => {
    const ok = await confirmDialog({ title: t.admin.revokeTitle, message: t.admin.revokeMessage, confirmLabel: t.admin.revoke, destructive: true })
    if (!ok) return
    try {
      await revokeInvite(i.id)
      if (justCreated?.id === i.id) setJustCreated(null)
      invalidate((k) => k[0] === 'admin' && k[1] === 'invites')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const memberAction = async (action: () => Promise<void>, message: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(message)
      setSelected(null)
      invalidate((k) => (k[0] === 'admin' && k[1] === 'members') || k[0] === 'members')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m: AdminMember) => {
    const ok = await confirmDialog({
      title: fmt(t.admin.removeTitle, { name: m.display_name }),
      message: t.admin.removeMessage,
      confirmLabel: t.admin.remove,
      destructive: true,
    })
    if (ok) await memberAction(() => setMemberStatus(m.id, 'removed'), fmt(t.admin.removedToast, { name: m.display_name }))
  }

  return (
    <PageBody>
      <section className="rounded-[16px] border border-line bg-elev p-4">
        <h2 className="flex items-center gap-2 font-list text-[23px] font-extrabold leading-none">
          <LuUserPlus className="size-5" /> {t.admin.inviteTitle}
        </h2>
        <p className="mt-1 text-[14px] text-muted">{t.admin.inviteBody}</p>

        <p className="mb-2 mt-4 text-[13px] font-semibold">{t.admin.usesLabel}</p>
        <div className="flex flex-wrap gap-2">
          {USES.map((n) => (
            <Chip key={n} active={uses === n} onClick={() => setUses(n)}>
              {plural(t.admin.people, n)}
            </Chip>
          ))}
        </div>
        <p className="mb-2 mt-4 text-[13px] font-semibold">{t.admin.validityLabel}</p>
        <div className="flex flex-wrap gap-2">
          {VALIDITY.map((v) => (
            <Chip key={v ?? 'never'} active={days === v} onClick={() => setDays(v)}>
              {v === null ? t.admin.noExpiry : plural(t.admin.days, v)}
            </Chip>
          ))}
        </div>
        <Button className="mt-5 w-full" size="lg" loading={creating} onClick={() => void create()}>
          {t.admin.create}
        </Button>

        {justCreated ? (
          <div className="mt-4 rounded-[12px] border border-line-strong p-3.5">
            <p className="text-[13px] font-semibold text-going">{t.admin.ready}</p>
            <p className="mt-1 select-all break-all font-mono text-[13px]">{inviteLink(justCreated.code)}</p>
            <InviteActions code={justCreated.code} />
          </div>
        ) : null}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{t.admin.activeLinks}</h2>
        {invites.isLoading ? (
          <ListSkeleton rows={1} />
        ) : active.length === 0 ? (
          <p className="rounded-[16px] border border-line bg-elev px-4 py-4 text-[14px] text-muted">{t.admin.noLinks}</p>
        ) : (
          <ul className="space-y-2">
            {active.map((i) => (
              <li key={i.id} className="rounded-[16px] border border-line bg-elev p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px]">…/invito/{i.code}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      {fmt(t.admin.used, { n: i.uses, max: i.max_uses })}
                      {i.expires_at
                        ? fmt(t.admin.expires, {
                            date: new Date(i.expires_at).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' }).replace(/\./g, ''),
                          })
                        : t.admin.neverExpires}
                    </p>
                  </div>
                  <button type="button" onClick={() => void revoke(i)} className="shrink-0 text-[13px] font-semibold text-no">
                    {t.admin.revoke}
                  </button>
                </div>
                <InviteActions code={i.code} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{t.settings.members}</h2>
        {members.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <ul className="divide-y divide-line rounded-[16px] border border-line bg-elev px-4">
            {people.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setSelected(m)} className="flex w-full items-center gap-3 py-3 text-left">
                  <Avatar person={m} size={40} className={cn(m.status === 'removed' && 'opacity-40 grayscale')} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-list text-[18px] font-bold uppercase', m.status === 'removed' && 'text-muted line-through decoration-no decoration-2')}>
                      {m.display_name}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {m.email ?? t.admin.noEmail}
                      {m.last_sign_in_at ? fmt(t.admin.lastSeen, { when: relativeTime(m.last_sign_in_at) }) : ''}
                    </span>
                  </span>
                  {m.role === 'admin' ? <LuShieldCheck className="size-5 shrink-0 text-muted" aria-label={t.members.admin} /> : null}
                  {m.status === 'removed' ? <span className="shrink-0 text-[12px] font-semibold text-no">{t.admin.removedTag}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.display_name}>
        {selected ? (
          <div className="grid gap-2 pt-1">
            {selected.status === 'active' ? (
              <>
                {selected.role === 'admin' ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    onClick={() => void memberAction(() => setMemberRole(selected.id, 'member'), t.admin.roleUpdated)}
                  >
                    {t.admin.demote}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    icon={<LuShieldCheck className="size-5" />}
                    onClick={() => void memberAction(() => setMemberRole(selected.id, 'admin'), fmt(t.admin.promotedToast, { name: selected.display_name }))}
                  >
                    {t.admin.promote}
                  </Button>
                )}
                {selected.id !== me.id ? (
                  <Button variant="danger" size="lg" disabled={busy} icon={<LuUserMinus className="size-5" />} onClick={() => void remove(selected)}>
                    {t.admin.remove}
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                size="lg"
                disabled={busy}
                onClick={() => void memberAction(() => setMemberStatus(selected.id, 'active'), fmt(t.admin.reactivatedToast, { name: selected.display_name }))}
              >
                {t.admin.reactivate}
              </Button>
            )}
          </div>
        ) : null}
      </Sheet>
    </PageBody>
  )
}

export default function AdminPage() {
  const { me } = useApp()
  const { m } = useI18n()
  return (
    <main>
      <PageHeader back title={m.admin.title} />
      {me.role === 'admin' ? <AdminContent /> : <EmptyState title={m.admin.onlyAdmins} />}
    </main>
  )
}
