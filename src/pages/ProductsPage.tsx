import { LayoutGrid, List, Package, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNewProduct } from '@/app/useNewProduct'
import { Button, EmptyState, GlassCard, Input, Segmented, Select, Skeleton, Switch } from '@/components/ui'
import { ProductCard, ProductRow } from '@/features/products/ProductCard'
import { StaleBanner } from '@/features/products/StaleBanner'
import { useEvaluatedProducts, useProductActions, type EvaluatedProduct } from '@/features/products/useProducts'
import { useUI } from '@/store/ui'

type SortKey = 'updated' | 'name' | 'price' | 'margin' | 'perHour'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Son güncellenen' },
  { value: 'name', label: 'Ad (A–Z)' },
  { value: 'price', label: 'Satış fiyatı (yüksek)' },
  { value: 'margin', label: 'Marj (yüksek)' },
  { value: 'perHour', label: 'Saat başı kâr (yüksek)' },
]

const ALL = '__all'
const norm = (s: string) => s.toLocaleLowerCase('tr-TR')
const num = (x: number | null) => x ?? -Infinity

function sortItems(items: EvaluatedProduct[], key: SortKey) {
  const sorted = [...items]
  switch (key) {
    case 'name':
      return sorted.sort((a, b) => a.product.name.localeCompare(b.product.name, 'tr'))
    case 'price':
      return sorted.sort((a, b) => b.product.salePrice - a.product.salePrice)
    case 'margin':
      return sorted.sort((a, b) => num(b.ev.sale.metrics.margin) - num(a.ev.sale.metrics.margin))
    case 'perHour':
      return sorted.sort((a, b) => num(b.ev.sale.metrics.profitPerHour) - num(a.ev.sale.metrics.profitPerHour))
    default:
      return sorted.sort((a, b) => b.product.updatedAt - a.product.updatedAt)
  }
}

export default function ProductsPage() {
  const { items, loaded } = useEvaluatedProducts()
  const { menu } = useProductActions()
  const view = useUI((s) => s.productsView)
  const setView = useUI((s) => s.setProductsView)
  const newProduct = useNewProduct()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [tag, setTag] = useState(ALL)
  const [sort, setSort] = useState<SortKey>('updated')
  const [showArchived, setShowArchived] = useState(false)

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr')), [items])
  const tags = useMemo(() => Array.from(new Set(items.flatMap((i) => i.product.tags))).sort((a, b) => a.localeCompare(b, 'tr')), [items])
  const archivedCount = items.filter((i) => i.product.archived).length

  const visible = useMemo(() => {
    const q = norm(query.trim())
    const filtered = items.filter(({ product: p }) => {
      if (p.archived !== showArchived) return false
      if (category !== ALL && p.category !== category) return false
      if (tag !== ALL && !p.tags.includes(tag)) return false
      if (q && !norm(`${p.name} ${p.category} ${p.tags.join(' ')}`).includes(q)) return false
      return true
    })
    return sortItems(filtered, sort)
  }, [items, query, category, tag, sort, showArchived])

  if (!loaded) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-11 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-card" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <GlassCard className="mx-auto max-w-3xl" padded={false}>
        <EmptyState
          icon={<Package />}
          title="Henüz ürün yok"
          description="Hesapla ekranında bir ürünü fiyatlayıp “Kaydet” dediğinde burada fotoğrafı, fiyatları ve marjıyla listelenir."
          action={
            <Button variant="primary" onClick={newProduct}>
              <Plus />
              İlk ürünü ekle
            </Button>
          }
        />
      </GlassCard>
    )
  }

  const filtersActive = query || category !== ALL || tag !== ALL

  return (
    <div className="@container flex min-w-0 flex-col gap-4">
      <StaleBanner items={items} />

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_220px]">
          <Input
            leading={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün, kategori veya etiket ara"
            aria-label="Ürün ara"
            type="search"
          />
        </div>
        <Select
          className="w-[calc(50%-4px)] sm:w-44"
          aria-label="Kategori filtresi"
          value={category}
          onChange={setCategory}
          options={[{ value: ALL, label: 'Tüm kategoriler' }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          className="w-[calc(50%-4px)] sm:w-40"
          aria-label="Etiket filtresi"
          value={tag}
          onChange={setTag}
          options={[{ value: ALL, label: 'Tüm etiketler' }, ...tags.map((t) => ({ value: t, label: `#${t}` }))]}
        />
        <Select
          className="min-w-0 flex-1 sm:w-52 sm:flex-none"
          aria-label="Sıralama"
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORTS}
        />
        <Segmented
          aria-label="Görünüm"
          value={view}
          onChange={setView}
          options={[
            { value: 'grid', label: <span className="sr-only">Izgara</span>, icon: <LayoutGrid /> },
            { value: 'list', label: <span className="sr-only">Liste</span>, icon: <List /> },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-2">
        <span>
          {visible.length} ürün{showArchived ? ' (arşiv)' : ''}
          {filtersActive && (
            <button
              type="button"
              className="ml-2 text-brand-2 hover:underline"
              onClick={() => {
                setQuery('')
                setCategory(ALL)
                setTag(ALL)
              }}
            >
              filtreleri temizle
            </button>
          )}
        </span>
        <label className="flex min-h-11 items-center gap-2.5">
          <span>Arşivi göster{archivedCount ? ` (${archivedCount})` : ''}</span>
          <Switch checked={showArchived} onChange={setShowArchived} aria-label="Arşivlenen ürünleri göster" />
        </label>
      </div>

      {visible.length === 0 ? (
        <GlassCard padded={false}>
          <EmptyState
            icon={<Search />}
            title={showArchived ? 'Arşivde ürün yok' : 'Eşleşen ürün yok'}
            description={showArchived ? 'Arşivlediğin ürünler burada görünür.' : 'Aramayı veya filtreleri değiştirmeyi dene.'}
          />
        </GlassCard>
      ) : view === 'grid' ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3 @7xl:grid-cols-4">
          {visible.map((i) => (
            <ProductCard key={i.product.id} product={i.product} ev={i.ev} menu={menu(i.product)} />
          ))}
        </div>
      ) : (
        <ul className="flex min-w-0 flex-col gap-2">
          {visible.map((i) => (
            <ProductRow key={i.product.id} product={i.product} ev={i.ev} menu={menu(i.product)} />
          ))}
        </ul>
      )}
    </div>
  )
}
