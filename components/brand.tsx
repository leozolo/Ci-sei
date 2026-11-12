import type { CSSProperties } from 'react'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/cn'

/*
 * Il simbolo dell'app viene da un solo file: public/brand/mark.svg
 * (il timbro al polso: anello, scritta e la spunta del pennarello).
 * Per cambiarlo sostituisci quel file e lancia `npm run icons`, che rigenera
 * le icone dell'app. Nel file il timbro è a due colori (gesso e verde), come
 * nelle icone; qui è usato come sagoma e prende un solo inchiostro, il verde
 * del tema (chiaro o scuro), come un timbro vero.
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
 * La firma di chi ha disegnato l'app: in fondo alla bacheca, alle Impostazioni e alle
 * schermate di accesso. In Arial a 16 px e uguale in tutte le lingue, come una firma.
 */
export function Credit({ className }: { className?: string }) {
  return (
    <p lang="en" className={cn('text-center font-credit text-[16px] leading-[1.45] text-faint', className)}>
      designed by <span className="text-muted">L.&nbsp;Zolovkin</span>
    </p>
  )
}
