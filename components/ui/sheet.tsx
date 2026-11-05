'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LuX } from 'react-icons/lu'
import { cn } from '@/lib/cn'

/** Pannello che sale dal basso (su computer: finestra centrata). */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), 240)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panel.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div
        className={cn('absolute inset-0 bg-scrim transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[88dvh] w-full flex-col rounded-t-[22px] border-t border-line bg-elev pb-safe shadow-[0_-12px_40px_var(--c-shadow)] outline-none transition-transform duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:mx-4 sm:max-w-md sm:rounded-[22px] sm:border sm:pb-0',
          visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-8 sm:opacity-0',
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-elev-3 sm:hidden" aria-hidden />
        {title ? (
          <div className="flex items-center gap-3 px-5 pb-1 pt-3">
            <h2 className="min-w-0 flex-1 font-list text-[23px] font-bold leading-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="press -mr-2 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-elev-2"
            >
              <LuX className="size-5" />
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
