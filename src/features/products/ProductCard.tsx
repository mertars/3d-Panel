import { Clock, Package, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Badge, ColorSwatch, Menu, type MenuItem } from '@/components/ui'
import { LICENSE_OPTIONS, type Product } from '@/db'
import { useBlobUrl } from '@/hooks/useBlobUrl'
import { cn } from '@/lib/cn'
import { formatHours, formatPercent, formatTL } from '@/lib/format'
import type { ProductEvaluation } from './evaluate'
import { marginTone } from './evaluate'

const tl = (v: number) => formatTL(v, { compactDecimals: true })

export function LicenseBadge({ product, size = 'xs' }: { product: Product; size?: 'xs' | 'sm' }) {
  const info = LICENSE_OPTIONS.find((l) => l.value === product.license)
  if (!info || info.ok) return null
  return (
    <Badge tone={product.license === 'personal' ? 'danger' : 'warning'} size={size} title="Model lisansı ticari satışa uygun olmayabilir">
      <ShieldAlert className="size-3" />
      {product.license === 'personal' ? 'Kişisel lisans' : 'Lisans bilinmiyor'}
    </Badge>
  )
}

export function ProductThumb({ product, className }: { product: Product; className?: string }) {
  const url = useBlobUrl(product.photo)
  return (
    <div className={cn('relative overflow-hidden bg-inset', className)}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--price-a-tint),transparent_60%),radial-gradient(circle_at_80%_90%,var(--price-b-tint),transparent_60%)] text-fg-3">
          <Package className="size-1/4 max-h-10 min-h-5 max-w-10 min-w-5" />
        </div>
      )}
    </div>
  )
}

export function Swatches({ colors, size = 16 }: { colors: string[]; size?: number }) {
  if (!colors.length) return null
  return (
    <span className="flex shrink-0 -space-x-1.5" role="img" aria-label={`${colors.length} renk`}>
      {colors.map((c) => (
        <ColorSwatch key={c} color={c} size={size} className="text-fg-3" />
      ))}
    </span>
  )
}

export function MarginBadge({ margin, size = 'xs' }: { margin: number | null; size?: 'xs' | 'sm' }) {
  return (
    <Badge tone={marginTone(margin)} size={size} title="Satış fiyatındaki marj (güncel maliyetle)">
      marj {formatPercent(margin, 0)}
    </Badge>
  )
}

interface CardProps {
  product: Product
  ev: ProductEvaluation
  menu: MenuItem[]
}

/** Izgara görünümü kartı */
export function ProductCard({ product, ev, menu }: CardProps) {
  const hours = ev.cost.hoursPerUnit
  return (
    <article className="glass glass-hover group relative flex min-w-0 flex-col overflow-hidden">
      <Link to={`/urunler/${product.id}`} className="absolute inset-0 z-[1] rounded-card" aria-label={`${product.name} detayı`} />
      <div className="relative">
        <ProductThumb product={product} className="aspect-[4/3] w-full" />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <LicenseBadge product={product} />
          {product.archived && <Badge size="xs">arşivde</Badge>}
          {ev.drift.stale && (
            <Badge tone="warning" size="xs">
              fiyat eski
            </Badge>
          )}
        </div>
        <div className="absolute top-1.5 right-1.5 z-[2] rounded-ctl bg-[var(--overlay)] backdrop-blur-sm">
          <Menu items={menu} label={`${product.name} eylemleri`} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">{product.name}</h3>
            <p className="truncate text-xs text-fg-3">{product.category || 'Kategorisiz'}</p>
          </div>
          <Swatches colors={ev.colors} />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-fg-3">
          <Clock className="size-3.5" />
          {hours > 0 ? formatHours(hours) : '—'}
          {product.variants.length > 0 && <span>· {product.variants.length} varyant</span>}
        </div>

        <dl className="tnum mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
          <div className="min-w-0">
            <dt className="flex items-center gap-1 text-fg-3">
              <span className="price-underline-a size-1.5 rounded-full" /> A
            </dt>
            <dd className="truncate font-medium text-fg-2">{tl(ev.prices.a.rounded)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1 text-fg-3">
              <span className="price-underline-b size-1.5 rounded-full" /> B
            </dt>
            <dd className="truncate font-medium text-fg-2">{tl(ev.prices.b.rounded)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-fg-3">Satış</dt>
            <dd className="truncate text-[15px] font-bold text-fg">{tl(product.salePrice)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MarginBadge margin={ev.sale.metrics.margin} />
          <span className="tnum text-xs text-fg-3">
            {ev.sale.metrics.profitPerHour === null ? 'saat başı —' : `${tl(ev.sale.metrics.profitPerHour)}/sa kâr`}
          </span>
        </div>
      </div>
    </article>
  )
}

/** Liste görünümü satırı */
export function ProductRow({ product, ev, menu }: CardProps) {
  return (
    <li className="glass glass-hover relative flex min-w-0 items-center gap-3 rounded-[16px] p-2.5 pr-1.5">
      <Link to={`/urunler/${product.id}`} className="absolute inset-0 z-[1] rounded-[16px]" aria-label={`${product.name} detayı`} />
      <ProductThumb product={product} className="size-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{product.name}</span>
          <Swatches colors={ev.colors} size={14} />
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
          <span className="truncate">{product.category || 'Kategorisiz'}</span>
          <span>· {ev.cost.hoursPerUnit > 0 ? formatHours(ev.cost.hoursPerUnit) : '—'}</span>
          <LicenseBadge product={product} />
          {ev.drift.stale && (
            <Badge tone="warning" size="xs">
              fiyat eski
            </Badge>
          )}
          {product.archived && <Badge size="xs">arşivde</Badge>}
        </div>
      </div>
      <div className="tnum hidden shrink-0 text-right text-xs text-fg-3 md:block">
        <div>A {tl(ev.prices.a.rounded)}</div>
        <div>B {tl(ev.prices.b.rounded)}</div>
      </div>
      <div className="tnum flex w-[92px] shrink-0 flex-col items-end gap-1 sm:w-[120px]">
        <span className="text-[15px] font-bold">{tl(product.salePrice)}</span>
        <MarginBadge margin={ev.sale.metrics.margin} />
      </div>
      <div className="tnum hidden w-24 shrink-0 text-right text-xs text-fg-2 lg:block">
        {ev.sale.metrics.profitPerHour === null ? '—' : `${tl(ev.sale.metrics.profitPerHour)}/sa`}
      </div>
      <div className="relative z-[2] shrink-0">
        <Menu items={menu} label={`${product.name} eylemleri`} />
      </div>
    </li>
  )
}
