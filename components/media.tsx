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
 * Locandina generata per gli eventi senza immagine: il titolo composto
 * come l'intestazione di una lista stampata, sul colore della categoria.
 */
export function PosterPlaceholder({ event, compact }: { event: PosterEvent; compact?: boolean }) {
  const c = categoryById(event.category)
  const Icon = c.icon
  const start = event.starts_at ? new Date(event.starts_at) : null
  return (
    <div
      aria-hidden
      className="@container absolute inset-0 flex flex-col justify-between overflow-hidden p-[7cqw] text-[#f3f1ec]"
      style={{ background: `hsl(${c.hue} 44% 21%)` }}
    >
      <Icon className="size-[13cqw] opacity-80" strokeWidth={1.75} />
      {compact ? null : (
        <div>
          <p className="line-clamp-4 font-poster text-[15cqw] font-extrabold uppercase leading-[0.88] [overflow-wrap:anywhere]">
            {event.title ?? c.one}
          </p>
          <div className="mt-[4cqw] h-px w-full bg-current opacity-35" />
          <p className="mt-[3cqw] font-list text-[6.4cqw] font-semibold uppercase leading-tight opacity-85">
            {start ? `${weekdayShort(start)} ${start.getDate()} ${monthShort(start)} · ${timeOf(start)}` : c.one}
            {event.location_name ? <span className="block truncate">{event.location_name}</span> : null}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Locandina dell'evento. Le locandine verticali (circa 4:5) riempiono il
 * riquadro; le altre restano intere, centrate sul fondo notte.
 */
export function Poster({
  event,
  className,
  children,
  eager,
  compact,
}: {
  event: PosterEvent
  className?: string
  children?: ReactNode
  eager?: boolean
  /** miniature: niente titolo nella locandina generata */
  compact?: boolean
}) {
  const url = useImageUrl('event-images', event.image_path)
  const [loaded, setLoaded] = useState<{ url: string; fill: boolean } | null>(null)
  const [broken, setBroken] = useState(false)
  const ready = !!url && loaded?.url === url
  const showImage = !!event.image_path && !broken

  const onLoad = (img: HTMLImageElement) => {
    if (!url || img.naturalWidth === 0) return
    const ratio = img.naturalWidth / img.naturalHeight
    const fill = ratio > 0.66 && ratio < 0.92
    // stesso valore = nessun nuovo render (il ref viene richiamato a ogni render)
    setLoaded((prev) => (prev && prev.url === url && prev.fill === fill ? prev : { url, fill }))
  }

  return (
    <div className={cn('@container relative isolate overflow-hidden bg-elev', className)}>
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
              className={cn(
                'absolute inset-0 size-full transition-opacity duration-300',
                loaded?.fill === false ? 'object-contain' : 'object-cover',
                ready ? 'opacity-100' : 'opacity-0',
              )}
            />
          ) : null}
        </>
      ) : (
        <PosterPlaceholder event={event} compact={compact} />
      )}
      {children}
    </div>
  )
}
