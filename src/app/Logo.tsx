import { useId } from 'react'
import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  // Her örnek kendi gradyan id'sini kullanır (gizli bir kopyaya referans verilirse boyanmaz)
  const id = `katman-g-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7A18" />
          <stop offset=".5" stopColor="#FF3D77" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#07070B" />
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} opacity=".14" />
      {/* "K" — katman çizgileriyle (uygulama ikonuyla aynı) */}
      <path
        fill={`url(#${id})`}
        d="M9.4 7h3.9v7.4L19.8 7h4.9l-7.1 7.9 7.5 10.1h-4.9l-5.5-7.6-1.5 1.6v6H9.4z"
      />
      <g fill="#07070B">
        <rect x="8" y="10.6" width="17" height="0.6" />
        <rect x="8" y="14.2" width="17" height="0.6" />
        <rect x="8" y="17.8" width="17" height="0.6" />
        <rect x="8" y="21.4" width="17" height="0.6" />
      </g>
    </svg>
  )
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark />
      {!collapsed && <span className="truncate text-[17px] font-semibold tracking-tight text-fg">Katman</span>}
    </div>
  )
}
