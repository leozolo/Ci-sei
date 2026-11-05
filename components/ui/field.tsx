import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { msgs } from '@/lib/i18n/core'

export const inputClass =
  'w-full rounded-[12px] border border-line bg-elev px-4 text-[16px] text-fg outline-none transition-colors placeholder:text-faint focus:border-going/70 disabled:opacity-60'

export function FieldLabel({ htmlFor, children, optional }: { htmlFor?: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-[14px] font-semibold text-fg">
      {children}
      {optional ? <span className="text-[13px] font-normal text-faint">{msgs().common.optional}</span> : null}
    </label>
  )
}

export function FieldHint({ children, error }: { children: ReactNode; error?: boolean }) {
  return <p className={cn('mt-1.5 text-[13px]', error ? 'text-no' : 'text-muted')}>{children}</p>
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  optional?: boolean
}

export function TextField({ label, hint, error, optional, id, className, ...rest }: TextFieldProps) {
  return (
    <div className={className}>
      {label ? (
        <FieldLabel htmlFor={id} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <input id={id} className={cn(inputClass, 'h-12', error && 'border-no')} aria-invalid={!!error || undefined} {...rest} />
      {error ? <FieldHint error>{error}</FieldHint> : hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  optional?: boolean
}

export function TextArea({ label, hint, optional, id, className, ...rest }: TextAreaProps) {
  return (
    <div className={className}>
      {label ? (
        <FieldLabel htmlFor={id} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}
      <textarea id={id} className={cn(inputClass, 'min-h-28 resize-y py-3 leading-relaxed')} {...rest} />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 py-3 text-left disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-[13px] text-muted">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors',
          checked ? 'bg-going' : 'bg-elev-3',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-6 rounded-full bg-[#f8f7f3] shadow-[0_1px_3px_var(--c-shadow)] transition-transform',
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
          )}
        />
      </span>
    </button>
  )
}
