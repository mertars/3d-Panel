import { FileSignature, Save, TriangleAlert } from 'lucide-react'
import { Badge, Button, Field, NumberInput, PriceCard, Segmented, StatCard } from '@/components/ui'
import type { Channel, SaleSource } from '@/db'
import { ChannelPriceTable } from '@/features/channels/ChannelPriceTable'
import { cn } from '@/lib/cn'
import { formatNumber, formatPercent, formatTL } from '@/lib/format'
import type { PriceResult, ProfitMetrics } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { CostDonut } from './CostDonut'
import { useCalculator } from './store'
import type { Calculation } from './useCalculation'

function MiniMetrics({ m }: { m: ProfitMetrics }) {
  const neg = m.profit < 0
  return (
    <dl className="tnum grid grid-cols-3 gap-2 text-xs">
      <div className="min-w-0">
        <dt className="text-fg-3">Kâr</dt>
        <dd className={cn('truncate font-semibold', neg ? 'text-danger' : 'text-fg')}>{formatTL(m.profit)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-fg-3">Marj</dt>
        <dd className={cn('truncate font-semibold', neg ? 'text-danger' : 'text-fg')}>{formatPercent(m.margin)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-fg-3">Saat başı</dt>
        <dd className={cn('truncate font-semibold', neg ? 'text-danger' : 'text-fg')}>
          {m.profitPerHour === null ? '—' : formatTL(m.profitPerHour)}
        </dd>
      </div>
    </dl>
  )
}

function ManualMetrics({ r }: { r: PriceResult }) {
  const m = r.metrics
  const tone = m.profit < 0 ? 'danger' : 'default'
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <StatCard label="Kâr" value={formatTL(m.profit)} tone={tone} />
      <StatCard label="Marj" value={formatPercent(m.margin)} tone={tone} />
      <StatCard label="Markup" value={formatPercent(m.markup)} tone={tone} />
      <StatCard label="Saat başı kâr" value={m.profitPerHour === null ? '—' : formatTL(m.profitPerHour)} tone={tone} />
      {r.withVat !== null && (
        <StatCard className="col-span-2" label="KDV dahil" value={formatTL(r.withVat)} />
      )}
    </div>
  )
}

interface PricePanelProps {
  calc: Calculation
  channels: Channel[]
  onSave: () => void
  /** Kaydeder (gerekirse) ve bu ürünle yeni teklif açar */
  onQuote: () => void
  saving: boolean
  className?: string
}

/** Sağdaki yapışkan fiyat paneli (mobilde sheet içinde) */
export function PricePanel({ calc, channels, onSave, onQuote, saving, className }: PricePanelProps) {
  const settings = useSettings()
  const manualPrice = useCalculator((s) => s.draft.manualPrice)
  const productId = useCalculator((s) => s.draft.productId)
  const dirty = useCalculator((s) => s.dirty)
  const saleSource = useCalculator((s) => s.draft.saleSource)
  const setDraft = useCalculator((s) => s.set)
  const { cost, prices, manual } = calc
  const showRaw = settings.rounding !== 'none'
  const higher = prices.a.rounded === prices.b.rounded ? null : prices.a.rounded > prices.b.rounded ? 'a' : 'b'
  const hasCost = cost.totalCost > 0

  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      {calc.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[14px] border border-warning/25 bg-warning/8 px-3.5 py-2.5" role="status">
          {calc.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 text-xs text-warning">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              <span className="min-w-0">{w}</span>
            </div>
          ))}
        </div>
      )}

      <PriceCard
        variant="a"
        title="Fiyat A · maliyet oranlı"
        subtitle={`maliyet × ${formatNumber(settings.costMultiplier)}`}
        rounded={prices.a.rounded}
        raw={prices.a.raw}
        showRaw={showRaw}
        highest={higher === 'a'}
        withVat={prices.a.withVat}
      >
        <MiniMetrics m={prices.a.metrics} />
      </PriceCard>

      <PriceCard
        variant="b"
        title="Fiyat B · saat oranlı"
        subtitle={`${settings.includeCostInB ? 'maliyet + ' : ''}${formatNumber(cost.hoursPerUnit, 2)} sa × ${formatTL(settings.hourlyProfit, { compactDecimals: true })}`}
        rounded={prices.b.rounded}
        raw={prices.b.raw}
        showRaw={showRaw}
        highest={higher === 'b'}
        withVat={prices.b.withVat}
      >
        <MiniMetrics m={prices.b.metrics} />
      </PriceCard>

      <div className="inset-surface flex min-w-0 items-center gap-3 rounded-[14px] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-fg">Taban fiyat</div>
          <div className="text-xs text-fg-3">= toplam maliyet · bunun altı zarar</div>
        </div>
        <div className="tnum shrink-0 text-lg font-semibold">{formatTL(cost.totalCost)}</div>
      </div>

      <div className="inset-surface rounded-[14px] p-4">
        <Field label="Manuel fiyat" htmlFor="manual-price" info="Kendi belirlediğin satış fiyatı. Kâr, marj ve saat başı kâr anında hesaplanır.">
          <NumberInput
            id="manual-price"
            value={manualPrice}
            onChange={(v) => setDraft({ manualPrice: v })}
            unit="₺"
            step={10}
            placeholder="ör. 299"
          />
        </Field>
        {manual && <ManualMetrics r={manual} />}
      </div>

      <div className="inset-surface rounded-[14px] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Maliyet dağılımı</h3>
          {cost.unitsPerPlate > 1 && <Badge size="xs">{cost.unitsPerPlate} adet/plaka</Badge>}
        </div>
        <CostDonut slices={calc.slices} total={cost.totalCost} />
      </div>

      <div className="inset-surface rounded-[14px] p-4">
        <ChannelPriceTable
          channels={channels}
          targets={[
            { value: 'a', label: 'A', amount: prices.a.rounded },
            { value: 'b', label: 'B', amount: prices.b.rounded },
            ...(manual ? [{ value: 'manual', label: 'Manuel', amount: manual.raw }] : []),
          ]}
        />
      </div>

      <div className="inset-surface flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-fg">Satış fiyatı olarak kaydet</div>
          <div className="tnum text-xs text-fg-3">
            {formatTL(saleSource === 'b' ? prices.b.rounded : saleSource === 'manual' && manual ? manual.raw : prices.a.rounded)}
            {saleSource === 'manual' && !manual && ' · manuel fiyat boş, A kullanılır'}
          </div>
        </div>
        <Segmented<SaleSource>
          aria-label="Satış fiyatı kaynağı"
          size="sm"
          value={saleSource}
          onChange={(v) => setDraft({ saleSource: v })}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'manual', label: 'Manuel' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" size="lg" className="flex-1" onClick={onSave} disabled={saving || !hasCost || (!!productId && !dirty)}>
          <Save />
          {productId ? (dirty ? 'Değişiklikleri kaydet' : 'Kaydedildi') : 'Kaydet'}
        </Button>
        <Button size="lg" className="flex-1" onClick={onQuote} disabled={saving || !hasCost}>
          <FileSignature />
          Teklif oluştur
        </Button>
      </div>
    </div>
  )
}
