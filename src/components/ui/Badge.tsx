import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'a' | 'b'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-strong text-fg-2 border-line',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  info: 'bg-info/12 text-info border-info/25',
  brand: 'bg-brand-2/12 text-brand-2 border-brand-2/25',
  a: 'bg-brand-1/14 text-brand-1 border-brand-1/25',
  b: 'bg-brand-3/16 text-[#a08bff] border-brand-3/30',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: 'xs' | 'sm'
}

export function Badge({ tone = 'neutral', size = 'sm', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        size === 'xs' ? 'h-[18px] px-1.5 text-[10.5px]' : 'h-6 px-2.5 text-xs',
        tones[tone],
        className,
      )}
      {...rest}
    />
  )
}
