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
import { invalidate, useQuery } from '@/lib/query'
import { whatsappUrl } from '@/lib/share'
import { sb } from '@/lib/supabase/client'
import type { AdminMember, InviteRow } from '@/lib/types'

const USES = [1, 5, 10, 25]
const VALIDITY: { days: number | null; label: string }[] = [
  { days: 1, label: '1 giorno' },
  { days: 7, label: '7 giorni' },
  { days: 30, label: '30 giorni' },
  { days: null, label: 'Senza scadenza' },
]

const inviteLink = (code: string) => `${window.location.origin}/invito/${code}`
const inviteMessage = (code: string) =>
  `Ti invito su «${APP_NAME}», la bacheca dove organizziamo le uscite del gruppo 🎉\nEntra da qui: ${inviteLink(code)}`

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
    toast.success('Link copiato')
  } catch {
    toast.error('Copia non riuscita: tieni premuto sul link per copiarlo')
  }
}

function InviteActions({ code }: { code: string }) {
  return (
    <div className="mt-3 flex gap-2">
      <a href={whatsappUrl(inviteMessage(code))} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm')}>
        <LuMessageCircle className="size-4" /> Invia su WhatsApp
      </a>
      <Button size="sm" variant="outline" icon={<LuCopy className="size-4" />} onClick={() => void copy(inviteLink(code))}>
        Copia link
      </Button>
    </div>
  )
}

function AdminContent() {
  const { me } = useApp()
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
    const ok = await confirmDialog({ title: 'Disattivare questo link?', message: 'Chi non l’ha ancora usato non potrà più entrare.', confirmLabel: 'Disattiva', destructive: true })
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
      title: `Rimuovere ${m.display_name}?`,
      message: 'Non vedrà più nulla del gruppo. I suoi eventi e messaggi restano. Puoi riattivarlo quando vuoi.',
      confirmLabel: 'Rimuovi dal gruppo',
      destructive: true,
    })
    if (ok) await memberAction(() => setMemberStatus(m.id, 'removed'), `${m.display_name} è stato rimosso`)
  }

  return (
    <PageBody>
      <section className="rounded-[24px] bg-elev p-4">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold tracking-[-0.02em]">
          <LuUserPlus className="size-5" /> Invita amici
        </h2>
        <p className="mt-1 text-[14px] text-muted">Crea un link e mandalo su WhatsApp: chi lo apre si registra ed entra nel gruppo.</p>

        <p className="mb-2 mt-4 text-[13px] font-semibold">Quante persone possono usarlo</p>
        <div className="flex flex-wrap gap-2">
          {USES.map((n) => (
            <Chip key={n} active={uses === n} onClick={() => setUses(n)}>
              {n === 1 ? '1 persona' : `${n} persone`}
            </Chip>
          ))}
        </div>
        <p className="mb-2 mt-4 text-[13px] font-semibold">Valido per</p>
        <div className="flex flex-wrap gap-2">
          {VALIDITY.map((v) => (
            <Chip key={v.label} active={days === v.days} onClick={() => setDays(v.days)}>
              {v.label}
            </Chip>
          ))}
        </div>
        <Button className="mt-5 w-full" size="lg" loading={creating} onClick={() => void create()}>
          Crea link d&apos;invito
        </Button>

        {justCreated ? (
          <div className="mt-4 rounded-[18px] bg-elev-2 p-3.5">
            <p className="text-[13px] font-semibold text-going">Link pronto</p>
            <p className="mt-1 select-all break-all font-mono text-[13px]">{inviteLink(justCreated.code)}</p>
            <InviteActions code={justCreated.code} />
          </div>
        ) : null}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">Link attivi</h2>
        {invites.isLoading ? (
          <ListSkeleton rows={1} />
        ) : active.length === 0 ? (
          <p className="rounded-[20px] bg-elev px-4 py-4 text-[14px] text-muted">Nessun link attivo.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((i) => (
              <li key={i.id} className="rounded-[20px] bg-elev p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px]">…/invito/{i.code}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      Usato {i.uses} su {i.max_uses}
                      {i.expires_at ? `, scade ${new Date(i.expires_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}` : ', senza scadenza'}
                    </p>
                  </div>
                  <button type="button" onClick={() => void revoke(i)} className="shrink-0 text-[13px] font-semibold text-no">
                    Disattiva
                  </button>
                </div>
                <InviteActions code={i.code} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">Membri</h2>
        {members.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <ul className="divide-y divide-line rounded-[20px] bg-elev px-4">
            {people.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setSelected(m)} className="flex w-full items-center gap-3 py-3 text-left">
                  <Avatar person={m} size={40} className={cn(m.status === 'removed' && 'opacity-40 grayscale')} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[15px] font-semibold', m.status === 'removed' && 'text-muted line-through')}>
                      {m.display_name}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {m.email ?? 'senza email'}
                      {m.last_sign_in_at ? `, ultimo accesso ${relativeTime(m.last_sign_in_at)}` : ''}
                    </span>
                  </span>
                  {m.role === 'admin' ? <LuShieldCheck className="size-5 shrink-0 text-muted" aria-label="Amministratore" /> : null}
                  {m.status === 'removed' ? <span className="shrink-0 text-[12px] font-semibold text-no">Rimosso</span> : null}
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
                    onClick={() => void memberAction(() => setMemberRole(selected.id, 'member'), 'Ruolo aggiornato')}
                  >
                    Togli il ruolo di amministratore
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    icon={<LuShieldCheck className="size-5" />}
                    onClick={() => void memberAction(() => setMemberRole(selected.id, 'admin'), `${selected.display_name} ora è amministratore`)}
                  >
                    Rendi amministratore
                  </Button>
                )}
                {selected.id !== me.id ? (
                  <Button variant="danger" size="lg" disabled={busy} icon={<LuUserMinus className="size-5" />} onClick={() => void remove(selected)}>
                    Rimuovi dal gruppo
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                size="lg"
                disabled={busy}
                onClick={() => void memberAction(() => setMemberStatus(selected.id, 'active'), `${selected.display_name} è di nuovo nel gruppo`)}
              >
                Riattiva nel gruppo
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
  return (
    <main>
      <PageHeader back title="Inviti e membri" />
      {me.role === 'admin' ? <AdminContent /> : <EmptyState title="Solo per amministratori" />}
    </main>
  )
}
