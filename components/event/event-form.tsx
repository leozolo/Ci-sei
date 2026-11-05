'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LuImagePlus, LuLink, LuSparkles, LuX } from 'react-icons/lu'
import { useMe } from '@/components/app-context'
import { Poster } from '@/components/media'
import { Button } from '@/components/ui/button'
import { FieldHint, FieldLabel, Switch, TextArea, TextField, inputClass } from '@/components/ui/field'
import { toast } from '@/components/ui/feedback'
import { createEvent, errorMessage, updateEvent } from '@/lib/actions'
import { CATEGORIES } from '@/lib/categories'
import { normalizeCity } from '@/lib/city'
import { DEFAULT_CITY } from '@/lib/config'
import { cn } from '@/lib/cn'
import { addDays, combineLocal, toDateInput, toTimeInput } from '@/lib/format'
import { useI18n } from '@/lib/i18n/react'
import { invalidate, isEventKey } from '@/lib/query'
import type { EventInput, EventView, LinkPreview } from '@/lib/types'

type Errors = Partial<Record<'title' | 'category' | 'date' | 'end' | 'link' | 'image', string>>

function normalizeUrl(v: string): string {
  const s = v.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s)) return `https://${s}`
  return s
}

function splitIsoLocal(iso: string): { date?: string; time?: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { date: iso }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return {}
  return { date: toDateInput(d), time: /T\d{2}:\d{2}/.test(iso) ? toTimeInput(d) : undefined }
}

export function EventForm({ event, defaultDate }: { event?: EventView; defaultDate?: string }) {
  const me = useMe()
  const router = useRouter()
  const editing = !!event
  const start = event ? new Date(event.starts_at) : null
  const end = event?.ends_at ? new Date(event.ends_at) : null

  const [link, setLink] = useState(event?.external_url ?? '')
  const [title, setTitle] = useState(event?.title ?? '')
  const [category, setCategory] = useState(event?.category ?? '')
  const [date, setDate] = useState(start ? toDateInput(start) : (defaultDate ?? ''))
  const [time, setTime] = useState(start ? toTimeInput(start) : '21:00')
  const [hasEnd, setHasEnd] = useState(!!end)
  const [endDate, setEndDate] = useState(end ? toDateInput(end) : '')
  const [endTime, setEndTime] = useState(end ? toTimeInput(end) : '')
  const [locationName, setLocationName] = useState(event?.location_name ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [city, setCity] = useState(event?.city ?? DEFAULT_CITY)
  const [description, setDescription] = useState(event?.description ?? '')
  const [alsoGoing, setAlsoGoing] = useState(true)
  const { m } = useI18n()
  const t = m.form

  // undefined = locandina invariata, null = rimossa, Blob = nuova
  const [image, setImage] = useState<Blob | null | undefined>(undefined)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    if (!(image instanceof Blob)) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const hasExistingPoster = !!event?.image_path && image === undefined

  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, image: t.errImageFile }))
      return
    }
    setErrors((e) => ({ ...e, image: undefined }))
    setImage(file)
  }

  const importFromLink = async (raw: string) => {
    const url = normalizeUrl(raw)
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) {
      setErrors((e) => ({ ...e, link: t.errLinkPaste }))
      return
    }
    setLink(url)
    setErrors((e) => ({ ...e, link: undefined }))
    setImporting(true)
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: 'no-store' })
      const p = (await res.json()) as LinkPreview
      let filled = 0
      if (p.title && !title.trim()) {
        setTitle(p.title)
        filled++
      }
      if (p.description && !description.trim()) {
        setDescription(p.description)
        filled++
      }
      if (p.locationName && !locationName.trim()) {
        setLocationName(p.locationName)
        filled++
      }
      if (p.address && !address.trim()) {
        setAddress(p.address)
        filled++
      }
      if (p.city && (!city.trim() || city === DEFAULT_CITY)) setCity(normalizeCity(p.city))
      if (p.startDate && !date) {
        const s = splitIsoLocal(p.startDate)
        if (s.date) {
          setDate(s.date)
          if (s.time) setTime(s.time)
          filled++
        }
        if (p.endDate) {
          const e = splitIsoLocal(p.endDate)
          if (e.date && e.time) {
            setHasEnd(true)
            setEndDate(e.date)
            setEndTime(e.time)
          }
        }
      }
      if (p.image && image === undefined && !event?.image_path) {
        try {
          const imgRes = await fetch(`/api/link-preview/image?url=${encodeURIComponent(p.image)}`)
          if (imgRes.ok) {
            const blob = await imgRes.blob()
            if (blob.type.startsWith('image/')) {
              setImage(blob)
              filled++
            }
          }
        } catch {
          // immagine non disponibile: nessun problema
        }
      }
      if (filled > 0) toast(t.importFilled)
      else toast(t.importEmpty)
    } catch {
      toast.error(t.importFailed)
    } finally {
      setImporting(false)
    }
  }

  const validate = (): { input: EventInput } | null => {
    const next: Errors = {}
    if (!title.trim()) next.title = t.errTitle
    if (!category) next.category = t.errCategory
    const startAt = combineLocal(date, time)
    if (!startAt) next.date = t.errDate
    let endAt: Date | null = null
    if (hasEnd && startAt) {
      endAt = combineLocal(endDate || date, endTime || '')
      // fine prima dell'inizio nello stesso giorno = finisce dopo mezzanotte
      if (endAt && endAt <= startAt && (!endDate || endDate === date)) endAt = addDays(endAt, 1)
      if (!endAt || endAt <= startAt) next.end = t.errEnd
    }
    const url = normalizeUrl(link)
    if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) next.link = t.errLink
    setErrors(next)
    const firstError = Object.keys(next)[0]
    if (firstError) {
      document.getElementById(`campo-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return null
    }
    return {
      input: {
        title: title.trim(),
        description: description.trim() || null,
        category,
        starts_at: startAt!.toISOString(),
        ends_at: endAt ? endAt.toISOString() : null,
        city: normalizeCity(city),
        location_name: locationName.trim() || null,
        address: address.trim() || null,
        external_url: url || null,
      },
    }
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (saving) return
    const valid = validate()
    if (!valid) return
    setSaving(true)
    try {
      if (event) {
        await updateEvent(me.id, event, valid.input, image)
        invalidate(isEventKey)
        toast.success(t.savedToast)
        router.replace(`/eventi/${event.id}`)
      } else {
        const id = await createEvent(me.id, valid.input, image ?? null, alsoGoing)
        invalidate(isEventKey)
        toast.success(t.publishedToast)
        router.replace(`/eventi/${id}`)
      }
    } catch (err) {
      toast.error(errorMessage(err, t.saveError))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7 pb-6" noValidate>
      {/* Link con importazione automatica */}
      <div id="campo-link">
        <FieldLabel htmlFor="link" optional>
          {t.link}
        </FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LuLink className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              id="link"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={t.linkPlaceholder}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onBlur={() => setLink((v) => normalizeUrl(v))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text').trim()
                if (!link.trim() && /^https?:\/\//i.test(pasted)) {
                  e.preventDefault()
                  void importFromLink(pasted)
                }
              }}
              className={cn(inputClass, 'h-12 pl-10', errors.link && 'border-no')}
            />
          </div>
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => void importFromLink(link)}
            loading={importing}
            disabled={!link.trim()}
            icon={<LuSparkles className="size-4" />}
          >
            {t.fill}
          </Button>
        </div>
        {errors.link ? (
          <FieldHint error>{errors.link}</FieldHint>
        ) : (
          <FieldHint>{t.linkHint}</FieldHint>
        )}
      </div>

      {/* Locandina */}
      <div id="campo-image">
        <FieldLabel optional>{t.poster}</FieldLabel>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {preview || hasExistingPoster ? (
          <div className="relative w-full max-w-[260px]">
            {preview ? (
              <img src={preview} alt={t.posterPreview} className="aspect-[4/5] w-full rounded-[12px] bg-elev-2 object-cover" />
            ) : event ? (
              <Poster event={event} className="aspect-[4/5] w-full rounded-[12px]" />
            ) : null}
            <div className="absolute inset-x-3 bottom-3 flex gap-2">
              <Button size="sm" variant="primary" onClick={() => fileInput.current?.click()}>
                {t.change}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setImage(null)} icon={<LuX className="size-4" />}>
                {t.remove}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="press flex aspect-[4/5] w-full max-w-[260px] flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line-strong text-muted hover:border-fg/60 hover:text-fg"
          >
            <LuImagePlus className="size-8" />
            <span className="text-[14px] font-semibold">{t.addPoster}</span>
            <span className="text-[12px]">{t.posterHint}</span>
          </button>
        )}
        {errors.image ? <FieldHint error>{errors.image}</FieldHint> : null}
      </div>

      <div id="campo-title">
        <TextField
          id="titolo"
          label={t.title}
          placeholder={t.titlePlaceholder}
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          autoCapitalize="sentences"
        />
      </div>

      <div id="campo-category">
        <FieldLabel>{t.category}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={cn(
                'press inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold',
                category === c.id ? 'border-fg bg-fg text-bg' : 'border-line-strong text-fg hover:border-fg/60',
              )}
            >
              <c.icon className="size-4" strokeWidth={1.9} aria-hidden />
              {c.one}
            </button>
          ))}
        </div>
        {errors.category ? <FieldHint error>{errors.category}</FieldHint> : null}
      </div>

      <div id="campo-date">
        <FieldLabel>{t.when}</FieldLabel>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <input
            type="date"
            aria-label={t.day}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(inputClass, 'h-12', errors.date && !date && 'border-no')}
          />
          <input
            type="time"
            aria-label={t.startTime}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={cn(inputClass, 'h-12')}
          />
        </div>
        {errors.date ? <FieldHint error>{errors.date}</FieldHint> : null}

        <div id="campo-end" className="mt-2">
          {hasEnd ? (
            <div className="rounded-[14px] border border-line bg-elev p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-semibold">{t.end}</span>
                <button
                  type="button"
                  onClick={() => {
                    setHasEnd(false)
                    setErrors((e) => ({ ...e, end: undefined }))
                  }}
                  className="text-[13px] text-muted underline-offset-4 hover:underline"
                >
                  {t.removeEnd}
                </button>
              </div>
              <div className="grid grid-cols-[1.4fr_1fr] gap-2">
                <input
                  type="date"
                  aria-label={t.endDay}
                  value={endDate}
                  min={date || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={cn(inputClass, 'h-12')}
                />
                <input
                  type="time"
                  aria-label={t.endTime}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={cn(inputClass, 'h-12')}
                />
              </div>
              <FieldHint>{t.endHint}</FieldHint>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHasEnd(true)
                setEndDate(date)
              }}
              className="text-[14px] font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              {t.addEnd}
            </button>
          )}
          {errors.end ? <FieldHint error>{errors.end}</FieldHint> : null}
        </div>
      </div>

      <div className="space-y-3">
        <TextField
          id="luogo"
          label={t.where}
          optional
          placeholder={t.venuePlaceholder}
          value={locationName}
          maxLength={200}
          onChange={(e) => setLocationName(e.target.value)}
        />
        <TextField
          id="indirizzo"
          aria-label={t.address}
          placeholder={t.addressPlaceholder}
          value={address}
          maxLength={300}
          onChange={(e) => setAddress(e.target.value)}
        />
        <TextField
          id="citta"
          label={t.city}
          value={city}
          maxLength={60}
          autoCapitalize="words"
          onChange={(e) => setCity(e.target.value)}
          onBlur={() => setCity((v) => normalizeCity(v))}
          hint={t.cityHint}
        />
      </div>

      <TextArea
        id="descrizione"
        label={t.description}
        optional
        placeholder={t.descriptionPlaceholder}
        value={description}
        maxLength={4000}
        rows={4}
        onChange={(e) => setDescription(e.target.value)}
      />

      {!editing ? (
        <div className="rounded-[14px] border border-line bg-elev px-4">
          <Switch checked={alsoGoing} onChange={setAlsoGoing} label={m.rsvp.putMe} description={t.alsoGoingHint} />
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={saving}>
        {editing ? t.saveChanges : t.publish}
      </Button>
    </form>
  )
}
