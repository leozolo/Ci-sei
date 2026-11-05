import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LuLoaderCircle } from 'react-icons/lu'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'going' | 'secondary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-invert text-invert-fg hover:opacity-90',
  going: 'bg-going text-going-ink hover:opacity-90',
  secondary: 'bg-elev-2 text-fg hover:bg-elev-3',
  ghost: 'bg-transparent text-fg hover:bg-elev-2',
  outline: 'border border-line-strong text-fg hover:bg-elev-2',
  danger: 'bg-no/10 text-no hover:bg-no/20',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-[10px] px-3.5 text-[14px]',
  md: 'h-11 gap-2 rounded-[12px] px-4 text-[15px]',
  lg: 'h-13 gap-2 rounded-[14px] px-5 text-[16px]',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'press inline-flex select-none items-center justify-center whitespace-nowrap font-semibold disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LuLoaderCircle aria-hidden className={cn('animate-spin', className ?? 'size-4')} />
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant, size, loading, icon, className, children, disabled, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  /** su immagini: fondo notte semitrasparente per restare leggibile */
  overlay?: boolean
}

/** Pulsante tondo con sola icona (con etichetta per l'accessibilità). */
export function IconButton({ label, overlay, className, children, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={cn(
        'press inline-flex size-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40',
        overlay ? 'bg-bg/75 text-fg shadow-[0_2px_10px_var(--c-shadow)] hover:bg-bg/90' : 'text-fg hover:bg-elev-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
