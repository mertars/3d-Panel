import { forwardRef } from 'react'
import type { AppSettings, Product, Quote } from '@/db'
import { useBlobUrl } from '@/hooks/useBlobUrl'
import { formatDate, formatTL } from '@/lib/format'
import { bulkDiscountFor } from '@/lib/pricing'
import { quoteTotal } from './actions'

function ItemThumb({ photo }: { photo: Blob | null }) {
  const url = useBlobUrl(photo)
  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-[10px] bg-[#f1f1f4]">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <div className="size-full bg-[linear-gradient(135deg,#ffe8d6,#efe7ff)]" />}
    </div>
  )
}

function Logo({ blob, name }: { blob: Blob | null; name: string }) {
  const url = useBlobUrl(blob)
  if (url) return <img src={url} alt={name} className="h-11 w-auto max-w-[140px] object-contain" />
  return (
    <div className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#FF7A18,#FF3D77,#7C5CFF)] text-lg font-bold text-white">
      {(name || 'K').trim().charAt(0).toUpperCase()}
    </div>
  )
}

interface QuoteCardProps {
  quote: Quote
  settings: Pick<AppSettings, 'brandName' | 'brandContact' | 'brandLogo' | 'bulkTiers' | 'vatEnabled' | 'vatPercent'>
  products: Map<string, Product>
}

/**
 * Müşteriye gösterilen teklif kartı. Temadan bağımsız, sabit açık renkli "belge" görünümü
 * (PNG, yazdırma ve ekran aynı görünsün). Maliyet ve kâr ASLA burada yer almaz.
 */
export const QuoteCard = forwardRef<HTMLDivElement, QuoteCardProps>(function QuoteCard({ quote, settings, products }, ref) {
  const items = quote.items.filter((i) => i.name.trim())
  const total = quoteTotal({ items })
  return (
    <div
      ref={ref}
      className="quote-card w-full overflow-hidden rounded-[20px] bg-white text-[#0b0b12] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.45)]"
      style={{ fontFamily: 'var(--font-sans)', colorScheme: 'light' }}
    >
      <div className="h-1.5 bg-[linear-gradient(90deg,#FF7A18,#FF3D77,#7C5CFF)]" />
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo blob={settings.brandLogo} name={settings.brandName} />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight">{settings.brandName || 'Teklif'}</div>
              {settings.brandContact && <div className="truncate text-xs text-[#6b6b76]">{settings.brandContact}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-wide text-[#6b6b76]">TEKLİF</div>
            <div className="tnum text-base font-semibold">{quote.number}</div>
            <div className="text-xs text-[#6b6b76]">{formatDate(quote.createdAt)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs text-[#6b6b76]">Sayın</div>
          <div className="text-lg font-semibold break-words">{quote.customer.trim() || 'Müşteri adı'}</div>
        </div>

        <ul className="mt-5 divide-y divide-[#ececf1] border-y border-[#ececf1]">
          {items.length === 0 && <li className="py-6 text-center text-sm text-[#8a8a94]">Henüz kalem yok</li>}
          {items.map((i) => {
            const product = i.productId ? products.get(i.productId) : undefined
            const disc = i.productId && !i.priceLocked ? bulkDiscountFor(i.quantity, settings.bulkTiers) : 0
            return (
              <li key={i.key} className="flex min-w-0 items-center gap-3 py-3">
                {product && <ItemThumb photo={product.photo} />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium break-words">{i.name}</div>
                  <div className="tnum text-xs text-[#6b6b76]">
                    {i.quantity} adet × {formatTL(i.unitPrice)}
                    {disc ? <span className="ml-1.5 rounded-full bg-[#e9f9ef] px-1.5 py-px text-[#15803d]">%{disc} adet indirimi</span> : null}
                  </div>
                </div>
                <div className="tnum shrink-0 text-sm font-semibold">{formatTL(i.unitPrice * i.quantity)}</div>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-xs text-[#6b6b76]">{settings.vatEnabled ? `Fiyatlara KDV (%${settings.vatPercent}) dahil değildir.` : ''}</div>
          <div className="text-right">
            <div className="text-xs text-[#6b6b76]">Toplam</div>
            <div className="tnum text-[32px] leading-tight font-bold tracking-[-0.03em]">{formatTL(total)}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-[14px] bg-[#f6f6f9] p-4 text-sm">
          <div className="min-w-0">
            <div className="text-xs text-[#6b6b76]">Teslim süresi</div>
            <div className="font-medium break-words">{quote.leadTime.trim() || '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#6b6b76]">Geçerlilik</div>
            <div className="font-medium">{formatDate(quote.validUntil)}</div>
          </div>
        </div>

        {quote.note.trim() && <p className="mt-4 text-sm whitespace-pre-line text-[#3f3f48]">{quote.note.trim()}</p>}
        <p className="mt-6 text-center text-[11px] text-[#9a9aa3]">Teşekkür ederiz · {settings.brandName}</p>
      </div>
    </div>
  )
})
