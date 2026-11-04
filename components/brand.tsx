import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/cn'

/** Simbolo dell'app: un punto interrogativo il cui punto è il "sì" verde. */
export function Mark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
      <path
        d="M178 196c0-48 38-82 84-82s82 30 82 74c0 36-22 54-46 70-22 15-38 28-38 58v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="58"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="260" cy="400" r="38" fill="var(--c-going)" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-display font-bold tracking-[-0.04em]', className)}>{APP_NAME}</span>
}
