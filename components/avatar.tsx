'use client'

import { useState } from 'react'
import { useAppMaybe } from '@/components/app-context'
import { useImageUrl } from '@/components/media'
import { cn } from '@/lib/cn'
import { msgs } from '@/lib/i18n/core'
import type { Member } from '@/lib/types'

type AvatarPerson = Pick<Member, 'id' | 'display_name' | 'avatar_url'>

function initials(name: string, single: boolean): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = !single && parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function colorFor(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `hsl(${h % 360} 34% 34%)`
}

export function Avatar({
  id,
  person,
  size = 32,
  className,
  compact,
}: {
  id?: string | null
  person?: AvatarPerson | null
  size?: number
  className?: string
  /** una sola iniziale (per i volti sovrapposti) */
  compact?: boolean
}) {
  const app = useAppMaybe()
  const p = person ?? (id ? app?.memberMap.get(id) : undefined) ?? null
  const name = p?.display_name ?? msgs().common.exMember
  const url = useImageUrl('avatars', p?.avatar_url ?? null)
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = !!url && failed !== url

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-list font-bold text-[#f3f1ec]',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        background: showImage ? 'var(--c-elev-3)' : colorFor(p?.id ?? id ?? name),
      }}
      title={name}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
        />
      ) : (
        initials(name, compact || size < 30)
      )}
    </span>
  )
}

/** Volti sovrapposti con eventuale "+N". */
export function AvatarStack({
  ids,
  max = 4,
  size = 24,
  ring = 'ring-bg',
  enterId,
}: {
  ids: string[]
  max?: number
  size?: number
  ring?: string
  /** il volto appena entrato in lista: entra con un piccolo movimento */
  enterId?: string
}) {
  if (ids.length === 0) return null
  const shown = ids.slice(0, max)
  const extra = ids.length - shown.length
  return (
    <span className="flex items-center" aria-hidden>
      {shown.map((id, i) => (
        <span key={id} className={cn('rounded-full ring-2', ring, i > 0 && '-ml-2', id === enterId && 'animate-name-in')}>
          <Avatar id={id} size={size} className="block" compact />
        </span>
      ))}
      {extra > 0 ? (
        <span
          className={cn('-ml-2 inline-flex items-center justify-center rounded-full bg-elev-3 font-list font-bold text-fg ring-2', ring)}
          style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  )
}
