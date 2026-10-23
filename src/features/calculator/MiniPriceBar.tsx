import { ChevronUp } from 'lucide-react'
import { createPortal } from 'react-dom'
import { AnimatedNumber } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatTL } from '@/lib/format'
import type { PriceSet } from '@/lib/pricing'

const fmt = (v: number) => formatTL(v, { compactDecimals: true })

interface MiniPriceBarProps {
  prices: PriceSet
  onOpen: () => void
  /** Mobil alt sekme çubuğunun üstüne yerleş */
  aboveTabs: boolean
  hidden: boolean
  /** Masaüstünde (dar içerikte) sol kenar boşluğu: sidebar genişliği */
  sidebarWidth: number
}

/** Mobil: sekme çubuğunun hemen üstünde ince A/B fiyat çubuğu. Dokununca tam panel açılır. */
export function MiniPriceBar({ prices, onOpen, aboveTabs, hidden, sidebarWidth }: MiniPriceBarProps) {
  if (hidden) return null
  return createPortal(
    <div
      className={cn('fixed z-30', aboveTabs ? 'inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom))]' : 'right-6 bottom-6')}
      style={aboveTabs ? undefined : { left: sidebarWidth + 24 }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="solid-surface flex h-14 w-full min-w-0 items-center gap-2 rounded-2xl px-2"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--price-a-tint)] px-3 py-2">
          <span className="price-underline-a h-6 w-1 shrink-0 rounded-full" aria-hidden />
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="text-[10.5px] text-fg-3">Fiyat A</span>
            <AnimatedNumber value={prices.a.rounded} format={fmt} className="tnum max-w-full truncate text-[17px] font-bold tracking-tight text-fg" />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--price-b-tint)] px-3 py-2">
          <span className="price-underline-b h-6 w-1 shrink-0 rounded-full" aria-hidden />
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="text-[10.5px] text-fg-3">Fiyat B</span>
            <AnimatedNumber value={prices.b.rounded} format={fmt} className="tnum max-w-full truncate text-[17px] font-bold tracking-tight text-fg" />
          </span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center text-fg-2">
          <span className="sr-only">Fiyat panelini aç</span>
          <ChevronUp className="size-5" aria-hidden />
        </span>
      </button>
    </div>,
    document.body,
  )
}
