'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LuChevronLeft } from 'react-icons/lu'
import { IconButton } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/** Intestazione fissa in alto con "indietro", titolo e azioni. */
export function PageHeader({
  title,
  back,
  actions,
  className,
}: {
  title?: ReactNode
  back?: boolean | string
  actions?: ReactNode
  className?: string
}) {
  const router = useRouter()
  const goBack = () => {
    if (window.history.length > 1) router.back()
    else router.push(typeof back === 'string' ? back : '/')
  }
  return (
    <header className={cn('pt-safe sticky top-0 z-30 bg-bg/85 backdrop-blur-xl', className)}>
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2">
        {back ? (
          <IconButton label="Indietro" onClick={goBack}>
            <LuChevronLeft className="size-6" />
          </IconButton>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate px-1 text-[17px] font-semibold">{title}</h1>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  )
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-2xl px-4', className)}>{children}</div>
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-faint">{icon}</div> : null}
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {children ? <div className="mt-1.5 text-[14px] text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3.5">
          <div className="skeleton aspect-[4/5] w-[68px] rounded-[14px]" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
