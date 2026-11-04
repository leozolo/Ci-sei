'use client'

import { useState, type ReactNode } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import { inputClass } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { WHEN_LABELS, type WhenFilter } from '@/lib/events'
import { dayHeading, parseDayKey, toDateInput } from '@/lib/format'

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold',
        active ? 'bg-invert text-invert-fg' : 'bg-elev-2 text-fg hover:bg-elev-3',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function whenLabel(value: WhenFilter): string {
  if (value.startsWith('day:')) return dayHeading(parseDayKey(value.slice(4)))
  return WHEN_LABELS[value] ?? 'Sempre'
}

/** Barra filtri: quando + categorie. */
export function FilterBar({
  when,
  onWhen,
  category,
  onCategory,
}: {
  when: WhenFilter
  onWhen: (v: WhenFilter) => void
  category: string | null
  onCategory: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const options: WhenFilter[] = ['all', 'today', 'tomorrow', 'weekend', 'week', 'month']
  const pickedDay = when.startsWith('day:') ? when.slice(4) : ''

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={when !== 'all'} onClick={() => setOpen(true)}>
          {when === 'all' ? 'Quando' : whenLabel(when)}
          <LuChevronDown className="size-4 opacity-70" />
        </Chip>
        <span className="my-1.5 w-px shrink-0 bg-line-strong" aria-hidden />
        <Chip active={!category} onClick={() => onCategory(null)}>
          Tutti
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => onCategory(category === c.id ? null : c.id)}>
            <span aria-hidden>{c.emoji}</span>
            {c.label}
          </Chip>
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Quando">
        <div className="grid gap-1.5 pt-1">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onWhen(o)
                setOpen(false)
              }}
              className={cn(
                'press flex items-center justify-between rounded-[16px] px-4 py-3.5 text-left text-[15px] font-semibold',
                when === o ? 'bg-invert text-invert-fg' : 'bg-elev-2',
              )}
            >
              {WHEN_LABELS[o]}
            </button>
          ))}
          <label className="mt-2 block text-[14px] font-semibold" htmlFor="filtro-giorno">
            Un giorno preciso
          </label>
          <input
            id="filtro-giorno"
            type="date"
            min={toDateInput(new Date())}
            value={pickedDay}
            onChange={(e) => {
              if (e.target.value) {
                onWhen(`day:${e.target.value}`)
                setOpen(false)
              }
            }}
            className={cn(inputClass, 'h-12')}
          />
        </div>
      </Sheet>
    </>
  )
}
