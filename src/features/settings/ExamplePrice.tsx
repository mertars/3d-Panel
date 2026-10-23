import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatedNumber } from '@/components/ui'
import { listPrinters, presetInfo } from '@/db'
import { cn } from '@/lib/cn'
import { formatTL } from '@/lib/format'
import { computeCost, computePrices, type PricingSettings, type PrinterCostInput } from '@/lib/pricing'
import { useSettings } from '@/store/settings'

const fmt = (v: number) => formatTL(v, { compactDecimals: true })

/** Örnek ürün: 85 g PLA, 4,5 saat, 15 dk işçilik, 10 ₺ ambalaj */
export function examplePrices(settings: PricingSettings, printer: PrinterCostInput) {
  const cost = computeCost(
    {
      mode: 'detailed',
      filaments: [{ gram: 85, purgeGram: 0, spoolPrice: 600, spoolGrams: 1000 }],
      printHours: 4.5,
      printer,
      laborMinutes: 15,
      extras: [],
      packaging: 10,
      unitsPerPlate: 1,
    },
    settings,
  )
  return { cost, prices: computePrices(cost, settings) }
}

export const FALLBACK_PRINTER: PrinterCostInput = {
  price: 35000,
  salvageValue: 5000,
  lifeHours: 5000,
  watts: presetInfo('p1s').watts,
  maintenancePerHour: 1.5,
}

/** Ayarlar değiştikçe canlı örnek fiyat */
export function ExamplePrice({ className, settingsOverride, printer }: { className?: string; settingsOverride?: Partial<PricingSettings>; printer?: PrinterCostInput }) {
  const base = useSettings()
  const printers = useLiveQuery(listPrinters, [], [])
  const def = printers.find((p) => p.isDefault) ?? printers[0]
  const usedPrinter = printer ?? (def && def.price ? def : FALLBACK_PRINTER)
  const { cost, prices } = examplePrices({ ...base, ...settingsOverride }, usedPrinter)

  return (
    <div className={cn('inset-surface rounded-[14px] p-4', className)}>
      <div className="text-xs text-fg-3">Canlı örnek · 85 g PLA, 4,5 saat baskı, 15 dk işçilik, 10 ₺ ambalaj</div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-fg-3">Maliyet</div>
          <AnimatedNumber value={cost.totalCost} format={fmt} className="tnum block truncate text-base font-semibold text-fg-2 sm:text-lg" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-fg-3">Fiyat A</div>
          <AnimatedNumber value={prices.a.rounded} format={fmt} className="tnum block truncate text-base font-bold text-fg sm:text-lg" />
          <div className="price-underline-a mt-1 h-0.5 w-8 rounded-full" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-fg-3">Fiyat B</div>
          <AnimatedNumber value={prices.b.rounded} format={fmt} className="tnum block truncate text-base font-bold text-fg sm:text-lg" />
          <div className="price-underline-b mt-1 h-0.5 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}
