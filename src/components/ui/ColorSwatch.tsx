import { cn } from '@/lib/cn'

interface ColorSwatchProps {
  color: string
  size?: number
  className?: string
  title?: string
}

/** Makara ikonu içinde gerçek HEX renk swatch'ı */
export function ColorSwatch({ color, size = 24, className, title }: ColorSwatchProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8" fill={color} />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeOpacity="0.18" />
      <circle cx="12" cy="12" r="2.6" fill="var(--bg)" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.8" />
      <path d="M7.6 8.2a6 6 0 0 1 4-2.1" stroke="white" strokeOpacity="0.45" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
