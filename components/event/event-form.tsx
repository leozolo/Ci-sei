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
import { cn } from '@/lib/cn'
import { addDays, combineLocal, toDateInput, toTimeInput } from '@/lib/format'
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
  const [description, setDescription] = useState(event?.description ?? '')
  const [alsoGoing, setAlsoGoing] = useState(true)

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
      setErrors((e) => ({ ...e, image: 'Scegli un file immagine (JPG, PNG…).' }))
      return
    }
    setErrors((e) => ({ ...e, image: undefined }))
    setImage(file)
  }

  const importFromLink = async (raw: string) => {
    const url = normalizeUrl(raw)
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) {
      setErrors((e) => ({ ...e, link: 'Incolla un link completo, per esempio https://dice.fm/…' }))
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
      if (filled > 0) toast('Ho compilato i campi dal link: controlla e completa.')
      else toast('Da questo link non ho ricavato dettagli: compila tu i campi.')
    } catch {
      toast.error('Non riesco a leggere quel link. Compila i campi a mano.')
    } finally {
      setImporting(false)
    }
  }

  const validate = (): { input: EventInput } | null => {
    const next: Errors = {}
    if (!title.trim()) next.title = 'Dai un titolo all’evento.'
    if (!category) next.category = 'Scegli una categoria.'
    const startAt = combineLocal(date, time)
    if (!startAt) next.date = 'Indica giorno e ora di inizio.'
    let endAt: Date | null = null
    if (hasEnd && startAt) {
      endAt = combineLocal(endDate || date, endTime || '')
      // fine prima dell'inizio nello stesso giorno = finisce dopo mezzanotte
      if (endAt && endAt <= startAt && (!endDate || endDate === date)) endAt = addDays(endAt, 1)
      if (!endAt || endAt <= startAt) next.end = 'La fine deve essere dopo l’inizio.'
    }
    const url = normalizeUrl(link)
    if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) next.link = 'Il link deve essere completo (https://…).'
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
        toast.success('Modifiche salvate')
        router.replace(`/eventi/${event.id}`)
      } else {
        const id = await createEvent(me.id, valid.input, image ?? null, alsoGoing)
        invalidate(isEventKey)
        toast.success('Evento pubblicato')
        router.replace(`/eventi/${id}`)
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Non sono riuscito a salvare. Riprova.'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7 pb-6" noValidate>
      {/* Link con importazione automatica */}
      <div id="campo-link">
        <FieldLabel htmlFor="link" optional>
          Link dell&apos;evento
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
              placeholder="Instagram, Dice, Eventbrite, sito…"
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
            Compila
          </Button>
        </div>
        {errors.link ? (
          <FieldHint error>{errors.link}</FieldHint>
        ) : (
          <FieldHint>Incolla il link e compiliamo noi titolo, data, luogo e locandina quando possibile.</FieldHint>
        )}
      </div>

      {/* Locandina */}
      <div id="campo-image">
        <FieldLabel optional>Locandina</FieldLabel>
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
              <img src={preview} alt="Anteprima locandina" className="aspect-[4/5] w-full rounded-[22px] bg-elev-2 object-cover" />
            ) : event ? (
              <Poster event={event} className="aspect-[4/5] w-full rounded-[22px]" />
            ) : null}
            <div className="absolute inset-x-3 bottom-3 flex gap-2">
              <Button size="sm" variant="primary" onClick={() => fileInput.current?.click()}>
                Cambia
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setImage(null)} icon={<LuX className="size-4" />}>
                Rimuovi
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="press flex aspect-[4/5] w-full max-w-[260px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line-strong text-muted hover:text-fg"
          >
            <LuImagePlus className="size-8" />
            <span className="text-[14px] font-semibold">Aggiungi la locandina</span>
            <span className="text-[12.5px]">foto o screenshot</span>
          </button>
        )}
        {errors.image ? <FieldHint error>{errors.image}</FieldHint> : null}
      </div>

      <div id="campo-title">
        <TextField
          id="titolo"
          label="Titolo"
          placeholder="Es. Techno all'alba al Brancaleone"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          autoCapitalize="sentences"
        />
      </div>

      <div id="campo-category">
        <FieldLabel>Categoria</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={cn(
                'press inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold',
                category === c.id ? 'bg-invert text-invert-fg' : 'bg-elev-2 text-fg hover:bg-elev-3',
              )}
            >
              <span aria-hidden>{c.emoji}</span>
              {c.one}
            </button>
          ))}
        </div>
        {errors.category ? <FieldHint error>{errors.category}</FieldHint> : null}
      </div>

      <div id="campo-date">
        <FieldLabel>Quando</FieldLabel>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <input
            type="date"
            aria-label="Giorno"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(inputClass, 'h-12', errors.date && !date && 'border-no')}
          />
          <input
            type="time"
            aria-label="Ora di inizio"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={cn(inputClass, 'h-12')}
          />
        </div>
        {errors.date ? <FieldHint error>{errors.date}</FieldHint> : null}

        <div id="campo-end" className="mt-2">
          {hasEnd ? (
            <div className="rounded-[20px] bg-elev p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-semibold">Fine</span>
                <button
                  type="button"
                  onClick={() => {
                    setHasEnd(false)
                    setErrors((e) => ({ ...e, end: undefined }))
                  }}
                  className="text-[13px] text-muted underline-offset-4 hover:underline"
                >
                  Togli
                </button>
              </div>
              <div className="grid grid-cols-[1.4fr_1fr] gap-2">
                <input
                  type="date"
                  aria-label="Giorno di fine"
                  value={endDate}
                  min={date || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={cn(inputClass, 'h-12')}
                />
                <input
                  type="time"
                  aria-label="Ora di fine"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={cn(inputClass, 'h-12')}
                />
              </div>
              <FieldHint>Se finisce dopo mezzanotte basta l&apos;ora: la data la capiamo noi.</FieldHint>
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
              + Aggiungi orario di fine (o più giorni)
            </button>
          )}
          {errors.end ? <FieldHint error>{errors.end}</FieldHint> : null}
        </div>
      </div>

      <div className="space-y-3">
        <TextField
          id="luogo"
          label="Dove"
          optional
          placeholder="Nome del locale"
          value={locationName}
          maxLength={200}
          onChange={(e) => setLocationName(e.target.value)}
        />
        <TextField
          id="indirizzo"
          aria-label="Indirizzo"
          placeholder="Indirizzo (via, città)"
          value={address}
          maxLength={300}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <TextArea
        id="descrizione"
        label="Descrizione"
        optional
        placeholder="Line-up, prezzo, dress code, cosa sapere…"
        value={description}
        maxLength={4000}
        rows={4}
        onChange={(e) => setDescription(e.target.value)}
      />

      {!editing ? (
        <div className="rounded-[20px] bg-elev px-4">
          <Switch checked={alsoGoing} onChange={setAlsoGoing} label="Partecipo anch'io" description="Segna subito la tua presenza." />
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={saving}>
        {editing ? 'Salva modifiche' : 'Pubblica'}
      </Button>
    </form>
  )
}
