import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Badge, type BadgeTone } from './Badge'

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  change?: { label: string; tone: BadgeTone }
  hint?: ReactNode
  className?: string
  tone?: 'default' | 'danger' | 'success'
}

/** Değer + (isteğe bağlı) değişim rozeti */
export function StatCard({ label, value, change, hint, className, tone = 'default' }: StatCardProps) {
  return (
    <div className={cn('inset-surface min-w-0 rounded-[14px] px-3.5 py-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs text-fg-3">{label}</span>
        {change && (
          <Badge tone={change.tone} size="xs" className="ml-auto">
            {change.label}
          </Badge>
        )}
      </div>
      <div
        className={cn(
          'tnum mt-1 truncate text-[17px] font-semibold tracking-tight',
          tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-fg',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-fg-3">{hint}</div>}
    </div>
  )
}
