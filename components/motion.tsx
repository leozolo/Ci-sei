'use client'

import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * Il movimento dell'app (DESIGN.md, Motion): fluido. Le cose salgono e si posano,
 * i numeri scivolano al nuovo valore. Con "riduci movimento" attivo restano solo
 * dissolvenze brevi (lo gestisce MotionConfig).
 */
export const EASE_FLUID: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Carica il motore delle animazioni una volta sola, con le sole funzioni che servono. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/** Ingresso morbido: sale e si posa, una volta sola, quando entra nello schermo. */
export function Rise({
  children,
  index = 0,
  lift = 16,
  from = 1,
  className,
}: {
  children: ReactNode
  /** posizione nel gruppo: ogni elemento parte poco dopo il precedente */
  index?: number
  /** di quanti pixel sale */
  lift?: number
  /** scala di partenza (1 = nessuna) */
  from?: number
  className?: string
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: lift, scale: from }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: EASE_FLUID, delay: Math.min(index, 8) * 0.08 }}
    >
      {children}
    </m.div>
  )
}

/** Un numero che scivola al nuovo valore quando cambia. */
export function SlideNumber({ value, className }: { value: number; className?: string }) {
  return (
    <m.span
      key={value}
      className={cn('inline-block', className)}
      initial={{ opacity: 0, y: '18%' }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_FLUID }}
    >
      {value}
    </m.span>
  )
}
