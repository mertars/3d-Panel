import { RefreshCw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimatedNumber, Button, Field, GlassCard, NumberInput, Segmented, StatCard } from '@/components/ui'
import { setSalePrice, type Product, type SaleSource } from '@/db'
import { pricingSettings } from '@/features/calculator/save'
import { formatPercent, formatTL } from '@/lib/format'
import { evaluatePrice } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import type { ProductEvaluation } from '../evaluate'
import { MarginBadge } from '../ProductCard'
import { applyCurrentPrice } from '../useProducts'

const fmt = (v: number) => formatTL(v, { compactDecimals: true })

/** "Satış fiyatı": A, B veya manuel seçilip kaydedilir */
export function SalePriceCard({ product, ev }: { product: Product; ev: ProductEvaluation }) {
  const settings = useSettings()
  const [source, setSource] = useState<SaleSource>(product.saleSource)
  const [manual, setManual] = useState<number | null>(product.saleSource === 'manual' ? product.salePrice : product.manualPrice)

  useEffect(() => {
    setSource(product.saleSource)
    setManual(product.saleSource === 'manual' ? product.salePrice : product.manualPrice)
  }, [product.saleSource, product.salePrice, product.manualPrice])

  const candidate = source === 'a' ? ev.prices.a.rounded : source === 'b' ? ev.prices.b.rounded : (manual ?? 0)
  const changed = source !== product.saleSource || Math.abs(candidate - product.salePrice) > 0.004
  const preview = evaluatePrice(candidate, ev.cost, { ...settings, rounding: 'none' })
  const m = preview.metrics
  const tone = m.profit < 0 ? 'danger' : 'default'

  async function save() {
    if (source === 'manual' && !(manual && manual > 0)) {
      toast('Manuel fiyat gir', { tone: 'danger' })
      return
    }
    await setSalePrice(product.id, {
      source,
      price: candidate,
      manualPrice: source === 'manual' ? manual : product.manualPrice,
      snapshot: {
        at: Date.now(),
        settings: pricingSettings(settings),
        cost: ev.cost,
        priceA: ev.prices.a,
        priceB: ev.prices.b,
        manual: source === 'manual' ? preview : product.snapshot.manual,
      },
    })
    toast(`Satış fiyatı ${fmt(candidate)} olarak kaydedildi`, { tone: 'success' })
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">Satış fiyatı</h2>
        <MarginBadge margin={m.margin} size="sm" />
      </div>
      <AnimatedNumber value={candidate} format={fmt} className="tnum mt-2 block truncate text-[44px] leading-none font-bold tracking-[-0.035em]" />
      <div className="brand-gradient mt-2.5 h-[3px] w-14 rounded-full" />
      {preview.withVat !== null && <p className="tnum mt-2 text-xs text-fg-3">KDV dahil {formatTL(preview.withVat)}</p>}

      <Segmented<SaleSource>
        aria-label="Satış fiyatı kaynağı"
        className="mt-4 w-full"
        value={source}
        onChange={setSource}
        options={[
          { value: 'a', label: `A · ${fmt(ev.prices.a.rounded)}` },
          { value: 'b', label: `B · ${fmt(ev.prices.b.rounded)}` },
          { value: 'manual', label: 'Manuel' },
        ]}
      />
      {source === 'manual' && (
        <Field label="Manuel fiyat" htmlFor="sale-manual" className="mt-3">
          <NumberInput id="sale-manual" value={manual} onChange={setManual} unit="₺" step={10} autoFocus />
        </Field>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Kâr" value={formatTL(m.profit)} tone={tone} />
        <StatCard label="Marj" value={formatPercent(m.margin)} tone={tone} />
        <StatCard label="Markup" value={formatPercent(m.markup)} tone={tone} />
        <StatCard label="Saat başı kâr" value={m.profitPerHour === null ? '—' : formatTL(m.profitPerHour)} tone={tone} />
      </div>

      {ev.drift.stale && !changed && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <span className="min-w-0 flex-1">
            Güncel hesap {fmt(ev.currentSalePrice)} ({ev.drift.diffPercent > 0 ? '+' : ''}
            {formatPercent(ev.drift.diffPercent)})
          </span>
          <Button
            size="sm"
            onClick={async () => {
              await applyCurrentPrice({ product, ev }, settings)
              toast('Yeni fiyat uygulandı', { tone: 'success' })
            }}
          >
            <RefreshCw />
            Yeni fiyatı uygula
          </Button>
        </div>
      )}

      <Button variant="primary" className="mt-4 w-full" onClick={() => void save()} disabled={!changed}>
        <Save />
        {changed ? 'Satış fiyatını kaydet' : 'Kayıtlı'}
      </Button>
    </GlassCard>
  )
}
