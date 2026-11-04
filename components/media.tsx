'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { categoryById } from '@/lib/categories'
import { cn } from '@/lib/cn'
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

export function PosterPlaceholder({ category }: { category: string }) {
  const c = categoryById(category)
  const accent = `hsl(${c.hue} ${c.sat}% 48% / 0.95)`
  const second = `hsl(${(c.hue + 38) % 360} ${c.sat}% 34% / 0.9)`
  const base = `hsl(${c.hue} ${Math.round(c.sat * 0.35)}% 9%)`
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `radial-gradient(120% 85% at 12% 0%, ${accent}, transparent 62%), radial-gradient(110% 70% at 100% 100%, ${second}, transparent 60%), ${base}`,
      }}
    >
      <span className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 select-none text-[22cqw] leading-none opacity-90 drop-shadow-lg">
        {c.emoji}
      </span>
    </div>
  )
}

/** Locandina dell'evento (o segnaposto colorato per categoria). */
export function Poster({
  event,
  className,
  children,
  eager,
  fit = 'cover',
}: {
  event: Pick<EventRow, 'image_path' | 'category'>
  className?: string
  children?: ReactNode
  eager?: boolean
  fit?: 'cover' | 'contain'
}) {
  const url = useImageUrl('event-images', event.image_path)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const loaded = !!url && loadedUrl === url
  const showImage = !!event.image_path && !broken

  return (
    <div className={cn('@container relative isolate overflow-hidden bg-elev-2', className)}>
      {showImage ? (
        <>
          {!loaded ? <div className="skeleton absolute inset-0" aria-hidden /> : null}
          {url ? (
            <img
              src={url}
              alt=""
              draggable={false}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              ref={(img) => {
                if (img && img.complete && img.naturalWidth > 0) setLoadedUrl(url)
              }}
              onLoad={() => setLoadedUrl(url)}
              onError={() => {
                if (event.image_path) forgetImageUrl('event-images', event.image_path)
                setBroken(true)
              }}
              className={cn(
                'absolute inset-0 size-full transition-opacity duration-300',
                fit === 'cover' ? 'object-cover' : 'object-contain',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          ) : null}
        </>
      ) : (
        <PosterPlaceholder category={event.category} />
      )}
      {children}
    </div>
  )
}
