import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  badge?: ReactNode
}

export function EmptyState({ icon, title, description, action, className, badge }: EmptyStateProps) {
  return (
    <div className={cn('flex min-w-0 flex-col items-center px-6 py-14 text-center', className)}>
      <div className="relative mb-5">
        <div aria-hidden className="brand-gradient absolute inset-0 rounded-2xl opacity-35 blur-xl" />
        <div className="inset-surface relative flex size-14 items-center justify-center rounded-2xl bg-elevated text-fg [&_svg]:size-6">
          {icon}
        </div>
      </div>
      {badge && <div className="mb-3">{badge}</div>}
      <h3 className="text-lg font-semibold tracking-tight text-balance text-fg">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-pretty text-fg-2">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}
