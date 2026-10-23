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
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} opacity=".14" />
      <rect x="6.5" y="19" width="19" height="4.2" rx="2.1" fill={`url(#${id})`} />
      <rect x="8.5" y="13.2" width="15" height="4.2" rx="2.1" fill={`url(#${id})`} opacity=".8" />
      <rect x="10.5" y="7.4" width="11" height="4.2" rx="2.1" fill={`url(#${id})`} opacity=".6" />
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
