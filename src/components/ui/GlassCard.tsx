import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padded?: boolean
}

export function GlassCard({ hover, padded = true, className, ...rest }: GlassCardProps) {
  return <div className={cn('glass min-w-0', hover && 'glass-hover', padded && 'p-5 sm:p-6', className)} {...rest} />
}

interface SectionProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

/** Başlıklı cam kart bölümü (formlar ve ayarlar için) */
export function Section({ title, description, icon, actions, children, className, id }: SectionProps) {
  return (
    <GlassCard className={className} id={id}>
      <div className="mb-5 flex min-w-0 items-start gap-3">
        {icon && (
          <div className="inset-surface flex size-9 shrink-0 items-center justify-center rounded-[10px] text-fg-2">{icon}</div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-fg-2">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </GlassCard>
  )
}
