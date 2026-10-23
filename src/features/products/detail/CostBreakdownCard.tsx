import { Receipt } from 'lucide-react'
import { Section } from '@/components/ui'
import type { Product } from '@/db'
import { cn } from '@/lib/cn'
import { formatDate, formatHours, formatTL } from '@/lib/format'
import type { CostBreakdown } from '@/lib/pricing'

function Line({ label, value, strong, muted, hint }: { label: string; value: number; strong?: boolean; muted?: boolean; hint?: string }) {
  return (
    <div className={cn('flex min-w-0 items-baseline gap-3 py-1.5', strong && 'border-t border-line pt-2.5')}>
      <dt className={cn('min-w-0 flex-1 truncate text-[13px]', strong ? 'font-semibold text-fg' : muted ? 'text-fg-3' : 'text-fg-2')}>
        {label}
        {hint && <span className="ml-1.5 text-[11px] text-fg-3">{hint}</span>}
      </dt>
      <dd className={cn('tnum shrink-0 text-[13px]', strong ? 'font-semibold text-fg' : 'text-fg')}>{formatTL(value)}</dd>
    </div>
  )
}

/** Güncel ayarlarla hesap dökümü (kayıt anındaki maliyetle karşılaştırmalı) */
export function CostBreakdownCard({ product, cost }: { product: Product; cost: CostBreakdown }) {
  const saved = product.snapshot.cost.totalCost
  const diff = cost.totalCost - saved
  return (
    <Section
      title="Hesap dökümü"
      description={`Güncel ayarlarla · kayıt: ${formatDate(product.snapshot.at)}`}
      icon={<Receipt className="size-4" />}
    >
      {cost.mode === 'quick' ? (
        <dl>
          <Line label="Girilen maliyet (hızlı mod)" value={cost.totalCost} />
          <Line label="Toplam maliyet (adet başı)" value={cost.totalCost} strong />
        </dl>
      ) : (
        <dl>
          <Line label="Filament" value={cost.filament} />
          <Line label="Elektrik" value={cost.electricity} />
          <Line label="Amortisman" value={cost.depreciation} />
          <Line label="Bakım / sarf" value={cost.maintenance} />
          <Line label="Üretim (ham)" value={cost.productionRaw} muted />
          <Line label="Fire" value={cost.productionWithWaste - cost.productionRaw} hint={`%${product.snapshot.settings.wastePercent}`} />
          <Line
            label="Üretim (fireli)"
            value={cost.productionWithWaste}
            muted
            hint={cost.unitsPerPlate > 1 ? `÷ ${cost.unitsPerPlate} adet = ${formatTL(cost.productionWithWaste / cost.unitsPerPlate)}` : undefined}
          />
          <Line label="İşçilik" value={cost.labor} />
          <Line label="Ekler + ambalaj" value={cost.extras} />
          <Line label="Toplam maliyet (adet başı)" value={cost.totalCost} strong />
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3">
        <span>Baskı: {cost.printHours > 0 ? formatHours(cost.printHours) : '—'}</span>
        {cost.unitsPerPlate > 1 && <span>Adet başı: {formatHours(cost.hoursPerUnit)}</span>}
        {Math.abs(diff) >= 0.005 && (
          <span className={diff > 0 ? 'text-warning' : 'text-success'}>
            Kayıttan bu yana {diff > 0 ? '+' : ''}
            {formatTL(diff)}
          </span>
        )}
      </div>
    </Section>
  )
}
