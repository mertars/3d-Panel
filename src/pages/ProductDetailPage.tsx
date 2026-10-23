import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ExternalLink, FileSignature, Package, Pencil } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLayout } from '@/app/AppShell'
import { useOpenProduct } from '@/app/useNewProduct'
import { Badge, Button, EmptyState, GlassCard, Menu, Skeleton } from '@/components/ui'
import { getProduct } from '@/db'
import { useCatalog } from '@/features/calculator/useCalculation'
import { ChannelPriceTable } from '@/features/channels/ChannelPriceTable'
import { BulkPriceCard } from '@/features/products/detail/BulkPriceCard'
import { CostBreakdownCard } from '@/features/products/detail/CostBreakdownCard'
import { LicenseCompetitorCard } from '@/features/products/detail/LicenseCompetitorCard'
import { PrintNotesCard } from '@/features/products/detail/PrintNotesCard'
import { SalePriceCard } from '@/features/products/detail/SalePriceCard'
import { VariantsCard } from '@/features/products/detail/VariantsCard'
import { evaluateProduct } from '@/features/products/evaluate'
import { LicenseBadge, ProductThumb, Swatches } from '@/features/products/ProductCard'
import { useProductActions } from '@/features/products/useProducts'
import { createQuoteForProduct } from '@/features/quotes/actions'
import { formatDate } from '@/lib/format'
import { useSettings } from '@/store/settings'

const TWO_COLUMN_MIN = 960

const PriceHistoryCard = lazy(() => import('@/features/products/detail/PriceHistoryCard').then((m) => ({ default: m.PriceHistoryCard })))

export default function ProductDetailPage() {
  const { id = '' } = useParams()
  const product = useLiveQuery(() => getProduct(id).then((p) => p ?? null), [id])
  const catalog = useCatalog()
  const settings = useSettings()
  const { contentWidth } = useLayout()
  const navigate = useNavigate()
  const openProduct = useOpenProduct()
  const { menu } = useProductActions()
  const ev = useMemo(() => (product && catalog.loaded ? evaluateProduct(product, catalog, settings) : null), [product, catalog, settings])

  if (product === undefined || (product && !ev)) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  if (product === null || !ev) {
    return (
      <GlassCard className="mx-auto max-w-2xl" padded={false}>
        <EmptyState
          icon={<Package />}
          title="Ürün bulunamadı"
          description="Silinmiş olabilir. Ürünler listesine dönüp tekrar dene."
          action={
            <Button onClick={() => navigate('/urunler')}>
              <ArrowLeft />
              Ürünler
            </Button>
          }
        />
      </GlassCard>
    )
  }

  const twoColumn = contentWidth >= TWO_COLUMN_MIN
  const unitCost = ev.cost.totalCost

  const header = (
    <GlassCard className="flex min-w-0 flex-wrap items-center gap-4">
      <ProductThumb product={product} className="size-20 shrink-0 rounded-2xl sm:size-24" />
      <div className="min-w-0 flex-[1_1_220px]">
        <Link to="/urunler" className="mb-1 inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
          <ArrowLeft className="size-3.5" /> Ürünler
        </Link>
        <h2 className="text-xl font-semibold tracking-tight break-words">{product.name}</h2>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 text-xs text-fg-3">
          <span>{product.category || 'Kategorisiz'}</span>
          <Swatches colors={ev.colors} size={14} />
          <LicenseBadge product={product} />
          {product.archived && <Badge size="xs">arşivde</Badge>}
          {product.tags.map((t) => (
            <Badge key={t} size="xs">
              #{t}
            </Badge>
          ))}
          <span>· güncelleme {formatDate(product.updatedAt)}</span>
        </div>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        {product.link && (
          <a
            href={product.link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-11 items-center gap-2 rounded-ctl border border-line bg-surface-strong px-3 text-sm font-medium hover:border-line-strong lg:h-10"
          >
            <ExternalLink className="size-4" />
            Model
          </a>
        )}
        <Button onClick={() => void openProduct(product.id)}>
          <Pencil />
          Düzenle
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            const q = await createQuoteForProduct(product, settings)
            navigate(`/teklifler/${q.id}`)
          }}
        >
          <FileSignature />
          Teklif
        </Button>
        <Menu items={menu(product, { afterDelete: () => navigate('/urunler') }).filter((m) => m.label !== 'Hesapla’da düzenle')} label="Diğer eylemler" />
      </div>
    </GlassCard>
  )

  const side = (
    <>
      <SalePriceCard product={product} ev={ev} />
      <GlassCard>
        <ChannelPriceTable
          channels={catalog.channels}
          defaultTarget="sale"
          targets={[
            { value: 'sale', label: 'Satış', amount: product.salePrice },
            { value: 'a', label: 'A', amount: ev.prices.a.rounded },
            { value: 'b', label: 'B', amount: ev.prices.b.rounded },
          ]}
        />
      </GlassCard>
    </>
  )

  const main = (
    <>
      <CostBreakdownCard product={product} cost={ev.cost} />
      <VariantsCard product={product} catalog={catalog} />
      <BulkPriceCard unitPrice={product.salePrice} unitCost={unitCost} />
      <LicenseCompetitorCard product={product} unitCost={unitCost} />
      <PrintNotesCard product={product} />
      <Suspense fallback={<Skeleton className="h-56 rounded-card" />}>
        <PriceHistoryCard productId={product.id} />
      </Suspense>
    </>
  )

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
      {header}
      {twoColumn ? (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(340px,400px)] items-start gap-5">
          <div className="@container flex min-w-0 flex-col gap-4 lg:gap-5">{main}</div>
          <aside aria-label="Satış ve kanallar" className="sticky top-[88px] flex min-w-0 flex-col gap-4">
            {side}
          </aside>
        </div>
      ) : (
        <div className="@container flex min-w-0 flex-col gap-4">
          {side}
          {main}
        </div>
      )}
    </div>
  )
}
