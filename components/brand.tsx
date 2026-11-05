import type { CSSProperties } from 'react'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/cn'

/*
 * Il simbolo dell'app viene da un solo file: public/brand/mark.svg
 * (per ora PROVVISORIO: la spunta del pennarello sulla lista).
 * Per cambiarlo sostituisci quel file e lancia `npm run icons`, che rigenera
 * le icone dell'app. Qui il simbolo è usato come sagoma e prende il verde
 * del tema (chiaro o scuro); se il simbolo definitivo è a più colori,
 * sostituisci lo span con <img src="/brand/mark.svg" alt="" />.
 */
const MARK_URL = '/brand/mark.svg'

export function Mark({ size = 48, className }: { size?: number; className?: string }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: 'currentColor',
    WebkitMaskImage: `url(${MARK_URL})`,
    maskImage: `url(${MARK_URL})`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  }
  return <span aria-hidden className={cn('inline-block shrink-0 text-going', className)} style={style} />
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-poster font-extrabold uppercase leading-none tracking-[0.005em]', className)}>{APP_NAME}</span>
  )
}

/**
 * La firma di chi ha disegnato l'app, in fondo alla bacheca: nel carattere normale
 * del telefono e uguale in tutte le lingue, come una firma.
 */
export function Credit({ className }: { className?: string }) {
  return (
    <p lang="en" className={cn('text-center text-[12px] text-faint', className)}>
      designed by <span className="text-muted">L.&nbsp;Zolovkin</span>
    </p>
  )
}
