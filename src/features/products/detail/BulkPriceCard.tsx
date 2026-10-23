import { Layers3, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Section } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatPercent, formatTL } from '@/lib/format'
import { bulkPriceTable } from '@/lib/pricing'
import { useSettings } from '@/store/settings'

/** Toplu adet fiyatı: 1/5/10/25/50 adet kademeli indirim (oranlar Ayarlar'dan) */
export function BulkPriceCard({ unitPrice, unitCost }: { unitPrice: number; unitCost: number }) {
  const settings = useSettings()
  const rows = bulkPriceTable(unitPrice, unitCost, settings.bulkTiers)
  const anyBelow = rows.some((r) => r.belowCost)
  return (
    <Section
      title="Toplu adet fiyatı"
      description={
        <>
          Satış fiyatından kademeli indirim · oranları <Link to="/ayarlar" className="text-brand-2 hover:underline">Ayarlar</Link>’dan değiştir
        </>
      }
      icon={<Layers3 className="size-4" />}
    >
      {anyBelow && (
        <p className="mb-3 flex items-center gap-2 rounded-[12px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
          <TriangleAlert className="size-4 shrink-0" />
          Bazı kademelerde birim fiyat maliyetin ({formatTL(unitCost)}) altına düşüyor.
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        <li className="hidden grid-cols-[64px_64px_1fr_1fr_1fr] gap-3 px-3 text-[11px] text-fg-3 @md:grid">
          <span>Adet</span>
          <span>İndirim</span>
          <span className="text-right">Birim</span>
          <span className="text-right">Toplam</span>
          <span className="text-right">Birim kâr</span>
        </li>
        {rows.map((r) => (
          <li
            key={r.quantity}
            className={cn(
              'tnum grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 rounded-[12px] border px-3 py-2 text-[13px] @md:grid-cols-[64px_64px_1fr_1fr_1fr]',
              r.belowCost ? 'border-danger/35 bg-danger/8' : 'border-line bg-inset',
            )}
          >
            <span className="font-semibold">{r.quantity} adet</span>
            <span className="text-right text-xs text-fg-3 @md:text-left @md:text-[13px]">{r.discountPercent ? `−${formatPercent(r.discountPercent)}` : '—'}</span>
            <span className="text-fg-2 @md:text-right">
              <span className="text-fg-3 @md:hidden">Birim </span>
              <span className="font-semibold text-fg">{formatTL(r.unitPrice)}</span>
            </span>
            <span className="text-right text-fg-2">
              <span className="text-fg-3 @md:hidden">Toplam </span>
              {formatTL(r.total)}
            </span>
            <span className={cn('col-span-2 text-right text-xs @md:col-span-1 @md:text-[13px]', r.belowCost ? 'font-semibold text-danger' : 'text-fg-2')}>
              <span className="text-fg-3 @md:hidden">Birim kâr </span>
              {formatTL(r.profitPerUnit)}
              {r.belowCost && ' · zarar'}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
