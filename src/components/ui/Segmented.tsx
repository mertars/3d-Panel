import { motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  'aria-label': string
  className?: string
  size?: 'sm' | 'md'
}

/** Segment kontrolü (radyo grubu, ok tuşlarıyla gezilebilir) */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md', ...aria }: SegmentedProps<T>) {
  const layoutId = useId()
  const idx = options.findIndex((o) => o.value === value)
  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      className={cn('inset-surface inline-flex min-w-0 rounded-ctl p-1', className)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault()
        const next = options[(idx + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]
        onChange(next.value)
        const btn = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')[options.indexOf(next)]
        btn?.focus()
      }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 font-medium whitespace-nowrap transition-colors [&_svg]:size-4',
              size === 'sm' ? 'h-11 text-[13px] lg:h-8' : 'h-11 text-sm lg:h-9',
              active ? 'text-fg' : 'text-fg-2 hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[9px] border border-line-strong bg-surface-strong shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
