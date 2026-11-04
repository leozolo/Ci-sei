'use client'

import { useSyncExternalStore } from 'react'
import { LuCircleAlert, LuCheck } from 'react-icons/lu'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

/* Avvisi temporanei (toast) e richieste di conferma, utilizzabili ovunque. */

interface ToastItem {
  id: number
  text: string
  tone: 'default' | 'error' | 'success'
  action?: { label: string; onClick: () => void }
}

interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  resolve: (ok: boolean) => void
}

interface State {
  toasts: ToastItem[]
  confirm: ConfirmRequest | null
}

let state: State = { toasts: [], confirm: null }
const listeners = new Set<() => void>()
const set = (next: Partial<State>) => {
  state = { ...state, ...next }
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
let nextId = 1

function push(text: string, tone: ToastItem['tone'], action?: ToastItem['action']) {
  const id = nextId++
  set({ toasts: [...state.toasts.slice(-2), { id, text, tone, action }] })
  setTimeout(() => set({ toasts: state.toasts.filter((t) => t.id !== id) }), action ? 5500 : 3200)
}

export const toast = Object.assign(
  (text: string, action?: ToastItem['action']) => push(text, 'default', action),
  {
    success: (text: string) => push(text, 'success'),
    error: (text: string) => push(text, 'error'),
  },
)

export function confirmDialog(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    state.confirm?.resolve(false)
    set({ confirm: { ...opts, resolve } })
  })
}

function closeConfirm(ok: boolean) {
  state.confirm?.resolve(ok)
  set({ confirm: null })
}

const getSnapshot = () => state

export function Feedback() {
  const { toasts, confirm } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium shadow-2xl',
              t.tone === 'error' ? 'bg-no text-white' : 'bg-invert text-invert-fg',
            )}
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            {t.tone === 'error' ? <LuCircleAlert className="size-5 shrink-0" /> : null}
            {t.tone === 'success' ? <LuCheck className="size-5 shrink-0" /> : null}
            <span className="min-w-0 flex-1">{t.text}</span>
            {t.action ? (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  set({ toasts: state.toasts.filter((x) => x.id !== t.id) })
                }}
                className="shrink-0 font-bold underline underline-offset-4"
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <Sheet open={!!confirm} onClose={() => closeConfirm(false)}>
        {confirm ? (
          <div className="pt-2 text-center">
            <h2 className="text-[18px] font-semibold">{confirm.title}</h2>
            {confirm.message ? <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">{confirm.message}</p> : null}
            <div className="mt-6 grid gap-2">
              <Button variant={confirm.destructive ? 'danger' : 'primary'} size="lg" onClick={() => closeConfirm(true)}>
                {confirm.confirmLabel}
              </Button>
              <Button variant="ghost" size="lg" onClick={() => closeConfirm(false)}>
                {confirm.cancelLabel ?? 'Annulla'}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  )
}
