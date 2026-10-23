import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Yatay ilerleme çubuğu; renk verilirse (ör. makara rengi) o renkle dolar */
export function ProgressBar({ value, color, className, label }: { value: number; color?: string; className?: string; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-strong', className)}
    >
      <div
        className={cn('h-full rounded-full', !color && 'brand-gradient')}
        style={{ width: `${pct}%`, background: color, boxShadow: color ? 'inset 0 0 0 1px rgba(127,127,127,.25)' : undefined }}
      />
    </div>
  )
}

/** Halka ilerleme (ör. "yazıcı kendini %38 ödedi") */
export function ProgressRing({ value, size = 96, stroke = 10, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const gid = `ring-${useId().replace(/:/g, '')}`
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF7A18" />
            <stop offset=".5" stopColor="#FF3D77" />
            <stop offset="1" stopColor="#7C5CFF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-strong)" strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
