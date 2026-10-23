import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { InfoTip } from './InfoTip'
import { Badge } from './Badge'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  info?: ReactNode
  error?: string | null
  estimated?: boolean
  children: ReactNode
  className?: string
}

/** Etiket + (ⓘ açıklama) + alan + ipucu/hata */
export function Field({ label, htmlFor, hint, info, error, estimated, children, className }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex min-h-5 items-center gap-1.5">
        <label htmlFor={htmlFor} className="truncate text-[13px] font-medium text-fg-2">
          {label}
        </label>
        {info && <InfoTip>{info}</InfoTip>}
        {estimated && (
          <Badge tone="warning" size="xs">
            tahmini
          </Badge>
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-fg-3">{hint}</p>
      )}
    </div>
  )
}
