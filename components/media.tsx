'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { categoryById } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { monthShort, timeOf, weekdayShort } from '@/lib/format'
import { forgetImageUrl, getImageUrl, peekImageUrl, type Bucket } from '@/lib/storage'
import type { EventRow } from '@/lib/types'

/** URL visualizzabile per un'immagine privata (o esterna). */
export function useImageUrl(bucket: Bucket, path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => peekImageUrl(bucket, path))
  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    const ready = peekImageUrl(bucket, path)
    if (ready) {
      setUrl(ready)
      return
    }
    let alive = true
    setUrl(null)
    void getImageUrl(bucket, path).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [bucket, path])
  return url
}

type PosterEvent = Pick<EventRow, 'image_path' | 'category'> & Partial<Pick<EventRow, 'title' | 'starts_at' | 'location_name'>>

/**
 * Locandina generata per gli eventi senza immagine: il titolo in Archivo largo
 * sul fondo rialzato, con data e luogo in monospace. Sta dentro la cornice come le altre.
 */
export function PosterPlaceholder({ event, compact }: { event: PosterEvent; compact?: boolean }) {
  const c = categoryById(event.category)
  const Icon = c.icon
  const start = event.starts_at ? new Date(event.starts_at) : null
  return (
    <div aria-hidden className="@container absolute inset-0 flex flex-col justify-between overflow-hidden bg-elev-2 p-[8cqw] text-fg">
      <Icon className={compact ? 'size-[44cqw] text-muted' : 'size-[13cqw] text-muted'} strokeWidth={1.75} />
      {compact ? null : (
        <div>
          <p className="line-clamp-4 font-wide text-[11cqw] font-black uppercase leading-[0.95] [overflow-wrap:anywhere]">
            {event.title ?? c.one}
          </p>
          <div className="mt-[5cqw] h-px w-full bg-line-strong" />
          <p className="mt-[4cqw] font-mono text-[4.6cqw] uppercase leading-snug tracking-[0.05em] text-muted">
            {start ? `${weekdayShort(start)} ${start.getDate()} ${monthShort(start)} — ${timeOf(start)}` : c.one}
            {event.location_name ? <span className="block truncate">{event.location_name}</span> : null}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * La cornice da biglietto: l'unico contenitore delle locandine. Fondo rialzato, bordo sottile,
 * spigoli netti; la locandina sta dentro intera, nei suoi colori, centrata qualunque sia il formato.
 * `strip` chiude la cornice con una riga di dati in monospace (un fatto a sinistra, uno a destra).
 */
export function Poster({
  event,
  className,
  children,
  eager,
  compact,
  strip,
}: {
  event: PosterEvent
  className?: string
  children?: ReactNode
  eager?: boolean
  /** miniature: niente titolo nella locandina generata */
  compact?: boolean
  strip?: [ReactNode, ReactNode?]
}) {
  const url = useImageUrl('event-images', event.image_path)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const ready = !!url && loadedUrl === url
  const showImage = !!event.image_path && !broken

  const onLoad = (img: HTMLImageElement) => {
    if (!url || img.naturalWidth === 0) return
    // stesso valore = nessun nuovo render (il ref viene richiamato a ogni render)
    setLoadedUrl((prev) => (prev === url ? prev : url))
  }

  return (
    <div className={cn('@container relative isolate flex flex-col overflow-hidden rounded-frame border border-line-strong bg-elev', className)}>
      <div className="relative m-[max(2px,4cqw)] min-h-0 flex-1">
        {showImage ? (
          <>
            {!ready ? <div className="skeleton absolute inset-0" aria-hidden /> : null}
            {url ? (
              <img
                src={url}
                alt=""
                draggable={false}
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                ref={(img) => {
                  if (img && img.complete) onLoad(img)
                }}
                onLoad={(e) => onLoad(e.currentTarget)}
                onError={() => {
                  if (event.image_path) forgetImageUrl('event-images', event.image_path)
                  setBroken(true)
                }}
                className={cn('absolute inset-0 size-full object-contain transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
              />
            ) : null}
          </>
        ) : (
          <PosterPlaceholder event={event} compact={compact} />
        )}
      </div>
      {strip ? <FrameStrip left={strip[0]} right={strip[1]} /> : null}
      {children}
    </div>
  )
}

/** La riga di dati che chiude una cornice. */
export function FrameStrip({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase leading-snug tracking-[0.06em] text-faint">
      <span className="min-w-0 truncate">{left}</span>
      {right ? <span className="min-w-0 truncate text-right">{right}</span> : null}
    </div>
  )
}
