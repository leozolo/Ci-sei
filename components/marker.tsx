import { cn } from '@/lib/cn'

/*
 * I segni del pennarello sulla lista: spunta = in lista, cerchio = forse,
 * barra = non viene. Sono la grammatica visiva dell'app: tratti disegnati,
 * con le estremità arrotondate, che possono "scriversi" al momento.
 */

export const TICK_PATH = 'M3.6 13.1C5.4 14.3 7 16.1 8.6 18.9 11.6 12.4 15.4 7.6 20.6 4.1'
const CIRCLE_PATH = 'M13.2 4.3C7.6 3.6 3.6 7.2 3.8 12.1c.2 4.6 4 7.7 8.7 7.6 4.7-.1 8-3.5 7.8-7.9-.2-4.1-3.4-7.2-7.8-7.3-1.4 0-2.6.3-3.6.8'
const STRIKE_PATH = 'M3.4 13.6C9 12.4 14.6 11.4 20.6 10.4'
const CROSS_PATH = 'M5.2 5.4c4.6 4.2 9 8.8 13.5 13.6M18.8 5.1C14.2 9.6 9.8 14.3 5.4 19.1'

interface MarkProps {
  className?: string
  /** disegna il tratto in tempo reale (il momento "mi metto in lista") */
  draw?: boolean
  /** testo per i lettori di schermo; senza, il segno è decorativo */
  title?: string
  strokeWidth?: number
}

function MarkerPath({ d, className, draw, title, strokeWidth = 3 }: MarkProps & { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(draw && 'marker-draw', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={d} pathLength={1} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MarkerTick(props: MarkProps) {
  return <MarkerPath d={TICK_PATH} {...props} />
}

export function MarkerCircle(props: MarkProps) {
  return <MarkerPath d={CIRCLE_PATH} strokeWidth={2.4} {...props} />
}

export function MarkerStrike(props: MarkProps) {
  return <MarkerPath d={STRIKE_PATH} {...props} />
}

/** "Non vengo": la croce del pennarello. */
export function MarkerCross(props: MarkProps) {
  return <MarkerPath d={CROSS_PATH} strokeWidth={2.8} {...props} />
}
