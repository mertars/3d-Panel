import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatTL } from '@/lib/format'
import { AnimatedNumber } from './AnimatedNumber'
import { Badge } from './Badge'

interface PriceCardProps {
  variant: 'a' | 'b'
  title: string
  subtitle: ReactNode
  rounded: number
  raw: number
  showRaw: boolean
  highest?: boolean
  withVat?: number | null
  children?: ReactNode
  size?: 'lg' | 'md'
  className?: string
}

const fmtBig = (v: number) => formatTL(v, { compactDecimals: true })

/** Fiyat A (turuncu-pembe) / Fiyat B (mor-mavi) kartı */
export function PriceCard({
  variant,
  title,
  subtitle,
  rounded,
  raw,
  showRaw,
  highest,
  withVat,
  children,
  size = 'lg',
  className,
}: PriceCardProps) {
  const isA = variant === 'a'
  return (
    <div
      className={cn('relative min-w-0 overflow-hidden rounded-card border p-5', isA ? 'border-brand-1/20' : 'border-brand-3/25', className)}
      style={{
        background: `linear-gradient(150deg, ${isA ? 'var(--price-a-tint)' : 'var(--price-b-tint)'}, transparent 70%), var(--inset)`,
      }}
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute -top-16 -right-10 size-40 rounded-full opacity-30 blur-2xl', isA ? 'bg-brand-2' : 'bg-brand-3')}
      />
      <div className="relative flex items-center gap-2">
        <span className={cn('size-2 rounded-full', isA ? 'price-underline-a' : 'price-underline-b')} />
        <span className="truncate text-[13px] font-medium text-fg-2">{title}</span>
        {highest && (
          <Badge tone={variant} size="xs" className="ml-auto">
            yüksek
          </Badge>
        )}
      </div>
      <div className="relative mt-0.5 truncate text-xs text-fg-3">{subtitle}</div>

      <div className="relative mt-3">
        <AnimatedNumber
          value={rounded}
          format={fmtBig}
          className={cn(
            'tnum block truncate leading-none font-bold tracking-[-0.035em] text-fg',
            size === 'lg' ? 'text-[44px] 2xl:text-[52px]' : 'text-[34px]',
          )}
        />
        <div className={cn('mt-2.5 h-[3px] w-14 rounded-full', isA ? 'price-underline-a' : 'price-underline-b')} />
      </div>

      <div className="tnum relative mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-3">
        {showRaw && <span>ham {formatTL(raw)}</span>}
        {withVat != null && <span>KDV dahil {formatTL(withVat)}</span>}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </div>
  )
}
