import { ArrowRight, RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Dialog } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatPercent, formatTL } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import { ProductThumb } from './ProductCard'
import { applyCurrentPrice, type EvaluatedProduct } from './useProducts'

const SOURCE_LABEL = { a: 'Fiyat A', b: 'Fiyat B', manual: 'Manuel (markup korunur)' } as const

/** "N ürünün fiyatı güncel maliyetin gerisinde" şeridi + eski/yeni karşılaştırma */
export function StaleBanner({ items }: { items: EvaluatedProduct[] }) {
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const stale = items.filter((i) => i.ev.drift.stale && !i.product.archived)
  if (stale.length === 0) return null
  const behind = stale.filter((i) => i.ev.drift.diffPercent > 0).length

  async function applyAll() {
    setBusy(true)
    for (const i of stale) await applyCurrentPrice(i, settings)
    setBusy(false)
    setOpen(false)
    toast(`${stale.length} ürünün fiyatı güncellendi`, { tone: 'success' })
  }

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-[16px] border border-warning/30 bg-warning/10 px-4 py-3" role="status">
        <TriangleAlert className="size-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">
            {behind === stale.length
              ? `${stale.length} ürünün fiyatı güncel maliyetin gerisinde`
              : `${stale.length} ürünün fiyatı güncel hesaplamadan %5’ten fazla farklı`}
          </p>
          <p className="text-xs text-fg-2">Filament, elektrik veya oran ayarları değişti. Eski ve yeni fiyatları karşılaştır.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          İncele
          <ArrowRight />
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Fiyatı eskimiş ürünler"
        description="Kayıtlı satış fiyatı ile güncel ayarlarla hesaplanan fiyat arasında %5’ten büyük fark var."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Kapat
            </Button>
            <Button variant="primary" onClick={() => void applyAll()} disabled={busy}>
              <RefreshCw />
              Tümüne yeni fiyatı uygula
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {stale.map((i) => (
            <li key={i.product.id} className="inset-surface flex min-w-0 flex-wrap items-center gap-3 rounded-[14px] p-2.5">
              <ProductThumb product={i.product} className="size-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Link to={`/urunler/${i.product.id}`} className="block truncate text-sm font-medium hover:underline" onClick={() => setOpen(false)}>
                  {i.product.name}
                </Link>
                <div className="text-[11px] text-fg-3">{SOURCE_LABEL[i.product.saleSource]}</div>
              </div>
              <div className="tnum flex items-center gap-2 text-sm">
                <span className="text-fg-3 line-through">{formatTL(i.product.salePrice, { compactDecimals: true })}</span>
                <ArrowRight className="size-3.5 text-fg-3" />
                <span className="font-semibold">{formatTL(i.ev.currentSalePrice, { compactDecimals: true })}</span>
                <span className={cn('text-xs', i.ev.drift.diffPercent > 0 ? 'text-warning' : 'text-info')}>
                  {i.ev.drift.diffPercent > 0 ? '+' : ''}
                  {formatPercent(i.ev.drift.diffPercent)}
                </span>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  await applyCurrentPrice(i, settings)
                  toast(`“${i.product.name}” güncellendi`, { tone: 'success' })
                }}
              >
                Uygula
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  )
}
