'use client'

import { useEffect, useMemo, useState } from 'react'
import { LuCalendarClock, LuMegaphone, LuMessageSquareQuote, LuPencil, LuPlus, LuSend, LuTrash2 } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Chip } from '@/components/filters'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { Button, IconButton } from '@/components/ui/button'
import { confirmDialog, toast } from '@/components/ui/feedback'
import { FieldLabel, inputClass, TextArea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import {
  createBroadcast,
  deleteBroadcastTemplate,
  errorMessage,
  saveBroadcastTemplate,
  sendDueBroadcasts,
  updateBroadcast,
} from '@/lib/actions'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/config'
import { capitalize, combineLocal, toDateInput, toTimeInput, whenShort } from '@/lib/format'
import { fmt, msgs, plural } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { invalidate, useQuery } from '@/lib/query'
import { sb } from '@/lib/supabase/client'
import type { BroadcastCategory, BroadcastRow, BroadcastTemplate } from '@/lib/types'

/** Lunghezza massima (la stessa del database): sul blocco schermo si legge tutto. */
const MAX = 180
const CATEGORIES: BroadcastCategory[] = ['weekend', 'social', 'events']

interface Reach {
  people: number
  devices: number
}

/** unavailable: il server non può inviare (nelle anteprime manca la chiave segreta) */
type ReachState = Reach | { unavailable: true }

interface Draft {
  id?: string
  category: BroadcastCategory
  body: string
}

const ms = (v: string) => new Date(v).getTime()

/** Prossima ora piena: l'orario proposto per programmare. */
function nextHour(): Date {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d
}

/** Giorno e ora scelti, solo se non sono già passati. */
function futureDate(day: string, time: string): Date | null {
  const when = combineLocal(day, time)
  return when && when.getTime() > Date.now() ? when : null
}

async function fetchBroadcasts(): Promise<BroadcastRow[]> {
  const { data, error } = await sb().from('broadcasts').select('*').order('created_at', { ascending: false }).limit(80)
  if (error) throw error
  return (data ?? []) as BroadcastRow[]
}

async function fetchTemplates(): Promise<BroadcastTemplate[]> {
  const { data, error } = await sb()
    .from('broadcast_templates')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as BroadcastTemplate[]
}

/** Quante persone hanno le notifiche attive: lo sa solo il server. */
async function fetchReach(): Promise<ReachState | null> {
  const res = await fetch('/api/push/broadcast', { cache: 'no-store' })
  if (res.status === 503) return { unavailable: true }
  if (!res.ok) return null
  const json = (await res.json()) as Partial<Reach>
  return typeof json.people === 'number' && typeof json.devices === 'number'
    ? { people: json.people, devices: json.devices }
    : null
}

const refreshBroadcasts = () => invalidate((k) => k[0] === 'admin' && k[1] === 'broadcasts')
const refreshTemplates = () => invalidate((k) => k[0] === 'admin' && k[1] === 'broadcast-templates')

/** Esito di una notifica già passata. */
function statusLine(b: BroadcastRow): string {
  const t = msgs().broadcast
  if (b.status === 'cancelled') return t.statusCancelled
  if (b.status === 'failed') return b.error === 'expired' ? t.statusExpired : t.statusFailed
  const people = b.people ?? 0
  if (people === 0) return t.statusNobody
  const missed = Math.max(0, (b.attempted ?? 0) - (b.delivered ?? 0))
  return plural(t.statusSent, people) + (missed > 0 ? plural(t.statusMissed, missed) : '')
}

function Counter({ n }: { n: number }) {
  const { m } = useI18n()
  return (
    <span className="shrink-0 text-[12px] tabular-nums text-faint">{fmt(m.broadcast.count, { n, max: MAX })}</span>
  )
}

/** Come appare la notifica sul telefono. */
function NotificationPreview({ body }: { body: string }) {
  const { m } = useI18n()
  return (
    <div className="flex gap-3 rounded-[16px] border border-line bg-elev-2 p-3" aria-live="polite">
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-semibold">{APP_NAME}</p>
          <span className="shrink-0 text-[12px] text-faint">{m.broadcast.now}</span>
        </div>
        <p className={cn('mt-0.5 whitespace-pre-line break-words text-[15px] leading-snug', !body && 'text-faint')}>
          {body || m.broadcast.previewEmpty}
        </p>
      </div>
    </div>
  )
}

function WhenPicker({ later, onChange }: { later: boolean; onChange: (later: boolean) => void }) {
  const { m } = useI18n()
  const t = m.broadcast
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={t.whenLabel}>
      {(
        [
          [false, t.whenNow],
          [true, t.whenLater],
        ] as const
      ).map(([value, label]) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={later === value}
          onClick={() => onChange(value)}
          className={cn(
            'press h-10 flex-1 rounded-full text-[13px] font-semibold',
            later === value ? 'bg-invert text-invert-fg' : 'bg-elev-2 text-fg',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function DateTimeFields({
  day,
  time,
  onDay,
  onTime,
  className,
}: {
  day: string
  time: string
  onDay: (v: string) => void
  onTime: (v: string) => void
  className?: string
}) {
  const { m } = useI18n()
  return (
    <div className={cn('grid grid-cols-[1.4fr_1fr] gap-2', className)}>
      <input
        type="date"
        aria-label={m.broadcast.day}
        value={day}
        min={toDateInput(new Date())}
        onChange={(e) => onDay(e.target.value)}
        className={cn(inputClass, 'h-12')}
      />
      <input
        type="time"
        aria-label={m.broadcast.time}
        value={time}
        onChange={(e) => onTime(e.target.value)}
        className={cn(inputClass, 'h-12')}
      />
    </div>
  )
}

/** Modifica di una notifica programmata (testo, giorno e ora). */
function EditForm({ row, onDone }: { row: BroadcastRow; onDone: () => void }) {
  const { m } = useI18n()
  const t = m.broadcast
  const [body, setBody] = useState(row.body)
  const [day, setDay] = useState(() => toDateInput(new Date(row.scheduled_at)))
  const [hour, setHour] = useState(() => toTimeInput(new Date(row.scheduled_at)))
  const [saving, setSaving] = useState(false)
  const text = body.trim()

  const save = async () => {
    if (!text) {
      toast.error(t.empty)
      return
    }
    const when = futureDate(day, hour)
    if (!when) {
      toast.error(t.pastTime)
      return
    }
    setSaving(true)
    try {
      const done = await updateBroadcast(row.id, { body: text, scheduled_at: when.toISOString() })
      if (done) toast.success(t.saved)
      else toast.error(t.alreadySent)
      refreshBroadcasts()
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 pt-1">
      <div>
        <TextArea
          id="modifica-messaggio"
          label={t.message}
          value={body}
          maxLength={MAX}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-1.5 flex justify-end">
          <Counter n={body.length} />
        </div>
      </div>
      <div>
        <FieldLabel>{t.whenLabel}</FieldLabel>
        <DateTimeFields day={day} time={hour} onDay={setDay} onTime={setHour} />
      </div>
      <NotificationPreview body={text} />
      <Button size="lg" loading={saving} disabled={!text} onClick={() => void save()}>
        {m.common.save}
      </Button>
    </div>
  )
}

/** Frasi pronte: un tocco per usarle, la matita per modificarle. */
function PresetsSheet({
  open,
  onClose,
  templates,
  loading,
  onPick,
}: {
  open: boolean
  onClose: () => void
  templates: BroadcastTemplate[] | undefined
  loading: boolean
  onPick: (body: string) => void
}) {
  const { m } = useI18n()
  const t = m.broadcast
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const items = templates ?? []

  useEffect(() => {
    if (!open) setDraft(null)
  }, [open])

  const save = async () => {
    if (!draft || !draft.body.trim()) return
    setSaving(true)
    try {
      const last = items.filter((x) => x.category === draft.category).reduce((max, x) => Math.max(max, x.position), 0)
      await saveBroadcastTemplate({ ...draft, position: last + 1 })
      toast.success(t.presetSaved)
      refreshTemplates()
      setDraft(null)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!draft?.id) return
    const ok = await confirmDialog({
      title: t.deletePresetTitle,
      message: draft.body,
      confirmLabel: t.deletePreset,
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteBroadcastTemplate(draft.id)
      toast.success(t.presetDeleted)
      refreshTemplates()
      setDraft(null)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={draft ? (draft.id ? t.editPreset : t.newPreset) : t.presets}>
      {draft ? (
        <div className="grid gap-4 pt-1">
          <div>
            <TextArea
              id="frase"
              label={t.presetText}
              value={draft.body}
              maxLength={MAX}
              rows={3}
              autoFocus
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="mt-1.5 flex justify-end">
              <Counter n={draft.body.length} />
            </div>
          </div>
          <div>
            <FieldLabel>{t.presetGroup}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} active={draft.category === c} onClick={() => setDraft({ ...draft, category: c })}>
                  {t.categories[c]}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid gap-2 pt-2">
            <Button size="lg" loading={saving} disabled={!draft.body.trim()} onClick={() => void save()}>
              {m.common.save}
            </Button>
            {draft.id ? (
              <Button variant="danger" size="lg" icon={<LuTrash2 className="size-5" />} onClick={() => void remove()}>
                {t.deletePreset}
              </Button>
            ) : null}
            <Button variant="ghost" size="lg" onClick={() => setDraft(null)}>
              {m.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-1">
          <p className="text-[14px] text-muted">{t.presetsHint}</p>
          {loading ? (
            <div className="mt-5">
              <ListSkeleton rows={2} />
            </div>
          ) : (
            CATEGORIES.map((c) => {
              const group = items.filter((x) => x.category === c)
              return (
                <section key={c} className="mt-5">
                  <h3 className="text-[13px] font-semibold text-muted">{t.categories[c]}</h3>
                  {group.length === 0 ? (
                    <p className="py-3 text-[14px] text-faint">{t.noPresets}</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {group.map((x) => (
                        <li key={x.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onPick(x.body)}
                            className="min-w-0 flex-1 py-3 text-left text-[15px] leading-snug"
                          >
                            {x.body}
                          </button>
                          <IconButton
                            label={t.editPreset}
                            className="-mr-2"
                            onClick={() => setDraft({ id: x.id, category: x.category, body: x.body })}
                          >
                            <LuPencil className="size-4 text-muted" />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })
          )}
          <Button
            variant="outline"
            className="mt-5 w-full"
            icon={<LuPlus className="size-5" />}
            onClick={() => setDraft({ category: 'weekend', body: '' })}
          >
            {t.addPreset}
          </Button>
        </div>
      )}
    </Sheet>
  )
}

function BroadcastContent() {
  const { me, members } = useApp()
  const { m } = useI18n()
  const t = m.broadcast
  const reach = useQuery(['admin', 'broadcast-reach', me.id], fetchReach, { staleMs: 30_000 })
  const list = useQuery(['admin', 'broadcasts', me.id], fetchBroadcasts)
  const templates = useQuery(['admin', 'broadcast-templates', me.id], fetchTemplates, { staleMs: 60_000 })

  const [body, setBody] = useState('')
  const [later, setLater] = useState(false)
  const [day, setDay] = useState(() => toDateInput(nextHour()))
  const [hour, setHour] = useState(() => toTimeInput(nextHour()))
  const [busy, setBusy] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [editing, setEditing] = useState<BroadcastRow | null>(null)

  const text = body.trim()
  const total = members.filter((p) => p.status === 'active').length
  const unavailable = !!reach.data && 'unavailable' in reach.data
  const people = reach.data && 'people' in reach.data ? reach.data.people : null
  const rows = list.data
  const scheduled = useMemo(
    () =>
      (rows ?? [])
        .filter((b) => b.status === 'scheduled' || b.status === 'sending')
        .sort((a, b) => ms(a.scheduled_at) - ms(b.scheduled_at)),
    [rows],
  )
  const history = useMemo(
    () =>
      (rows ?? [])
        .filter((b) => b.status !== 'scheduled' && b.status !== 'sending')
        .sort((a, b) => ms(b.sent_at ?? b.scheduled_at) - ms(a.sent_at ?? a.scheduled_at))
        .slice(0, 30),
    [rows],
  )

  // finché ci sono notifiche in programma la lista si aggiorna da sola
  const { refresh } = list
  const pending = scheduled.length > 0
  useEffect(() => {
    if (!pending) return
    const id = window.setInterval(() => void refresh(), 20_000)
    return () => window.clearInterval(id)
  }, [pending, refresh])

  const submit = async () => {
    if (!text) {
      toast.error(t.empty)
      return
    }
    if (later) {
      const when = futureDate(day, hour)
      if (!when) {
        toast.error(t.pastTime)
        return
      }
      setBusy(true)
      try {
        await createBroadcast(text, when)
        toast.success(fmt(t.scheduledToast, { when: whenShort(when) }))
        setBody('')
        refreshBroadcasts()
      } catch (err) {
        toast.error(errorMessage(err))
      } finally {
        setBusy(false)
      }
      return
    }

    const ok = await confirmDialog({
      title: plural(t.sendTitle, people ?? 0),
      message: text,
      confirmLabel: t.send,
    })
    if (!ok) return
    setBusy(true)
    try {
      const row = await createBroadcast(text, null)
      const results = await sendDueBroadcasts()
      const mine = results?.find((r) => r.id === row.id)
      // senza risposta del server parte comunque entro un minuto
      if (!mine) toast(t.queued)
      else if (mine.people > 0) toast.success(plural(t.sent, mine.people))
      else toast.error(t.sentNobody)
      setBody('')
      refreshBroadcasts()
      void reach.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (b: BroadcastRow) => {
    const ok = await confirmDialog({
      title: t.cancelTitle,
      message: b.body,
      confirmLabel: t.cancelConfirm,
      cancelLabel: t.keep,
      destructive: true,
    })
    if (!ok) return
    try {
      const done = await updateBroadcast(b.id, { status: 'cancelled' })
      if (done) toast.success(t.cancelled)
      else toast.error(t.alreadySent)
      refreshBroadcasts()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <PageBody>
      <section className="rounded-[16px] border border-line bg-elev p-4">
        <h2 className="flex items-center gap-2 font-list text-[23px] font-extrabold leading-none">
          <LuMegaphone className="size-5" /> {t.composeTitle}
        </h2>
        <p className="mt-1 text-[14px] text-muted">
          {unavailable ? t.unavailable : people !== null ? plural(t.reach, people, { total }) : t.reachUnknown}
        </p>

        <TextArea
          id="messaggio"
          className="mt-4"
          label={t.message}
          placeholder={t.placeholder}
          value={body}
          maxLength={MAX}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p className="text-[13px] text-muted">{t.sameForAll}</p>
          <Counter n={body.length} />
        </div>
        <Button
          className="mt-3"
          variant="outline"
          size="sm"
          icon={<LuMessageSquareQuote className="size-4" />}
          onClick={() => setPresetsOpen(true)}
        >
          {t.presets}
        </Button>

        <p className="mb-2 mt-5 text-[13px] font-semibold">{t.preview}</p>
        <NotificationPreview body={text} />

        <p className="mb-2 mt-5 text-[13px] font-semibold">{t.whenLabel}</p>
        <WhenPicker later={later} onChange={setLater} />
        {later ? <DateTimeFields className="mt-2" day={day} time={hour} onDay={setDay} onTime={setHour} /> : null}

        <Button
          className="mt-5 w-full"
          size="lg"
          loading={busy}
          disabled={!text || unavailable}
          icon={later ? <LuCalendarClock className="size-5" /> : <LuSend className="size-5" />}
          onClick={() => void submit()}
        >
          {later ? t.schedule : t.send}
        </Button>
      </section>

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{t.scheduledTitle}</h2>
        {list.isLoading ? (
          <ListSkeleton rows={1} />
        ) : scheduled.length === 0 ? (
          <p className="rounded-[16px] border border-line bg-elev px-4 py-4 text-[14px] text-muted">{t.noScheduled}</p>
        ) : (
          <ul className="divide-y divide-line rounded-[16px] border border-line bg-elev px-4">
            {scheduled.map((b) => {
              const leaving = b.status === 'sending' || ms(b.scheduled_at) <= Date.now()
              return (
                <li key={b.id} className="py-3.5">
                  <p className="text-[13px] font-semibold">{capitalize(whenShort(b.scheduled_at))}</p>
                  <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-snug">{b.body}</p>
                  {leaving ? (
                    <p className="mt-1.5 text-[13px] text-muted">{t.statusSending}</p>
                  ) : (
                    <div className="mt-2 flex gap-5">
                      <button type="button" onClick={() => setEditing(b)} className="text-[13px] font-semibold">
                        {t.edit}
                      </button>
                      <button type="button" onClick={() => void cancel(b)} className="text-[13px] font-semibold text-no">
                        {t.cancel}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{t.historyTitle}</h2>
        {list.isLoading ? (
          <ListSkeleton rows={1} />
        ) : history.length === 0 ? (
          <p className="rounded-[16px] border border-line bg-elev px-4 py-4 text-[14px] text-muted">{t.noHistory}</p>
        ) : (
          <ul className="divide-y divide-line rounded-[16px] border border-line bg-elev px-4">
            {history.map((b) => (
              <li key={b.id} className="py-3.5">
                <p className="text-[13px] text-muted">{capitalize(whenShort(b.sent_at ?? b.scheduled_at))}</p>
                <p
                  className={cn(
                    'mt-1 whitespace-pre-line break-words text-[15px] leading-snug',
                    b.status === 'cancelled' && 'text-muted line-through decoration-no decoration-2',
                  )}
                >
                  {b.body}
                </p>
                <p className={cn('mt-1.5 text-[13px]', b.status === 'sent' ? 'text-muted' : 'text-no')}>
                  {statusLine(b)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PresetsSheet
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        templates={templates.data}
        loading={templates.isLoading}
        onPick={(value) => {
          setBody(value.slice(0, MAX))
          setPresetsOpen(false)
        }}
      />

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={t.editTitle}>
        {editing ? <EditForm key={editing.id} row={editing} onDone={() => setEditing(null)} /> : null}
      </Sheet>
    </PageBody>
  )
}

export default function BroadcastPage() {
  const { me } = useApp()
  const { m } = useI18n()
  return (
    <main>
      <PageHeader back="/impostazioni" title={m.broadcast.title} />
      {me.role === 'admin' ? <BroadcastContent /> : <EmptyState title={m.admin.onlyAdmins} />}
    </main>
  )
}
