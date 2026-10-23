import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Copy, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useOpenProduct } from '@/app/useNewProduct'
import type { MenuItem } from '@/components/ui'
import {
  deleteProduct,
  duplicateProduct,
  listProducts,
  restoreProduct,
  setSalePrice,
  updateProduct,
  type AppSettings,
  type Product,
  type ProductSnapshot,
} from '@/db'
import { useCatalog } from '@/features/calculator/useCalculation'
import { pricingSettings } from '@/features/calculator/save'
import { evaluatePrice } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import { evaluateProduct, type ProductEvaluation } from './evaluate'

export interface EvaluatedProduct {
  product: Product
  ev: ProductEvaluation
}

/** Tüm ürünler, güncel ayar ve katalogla yeniden hesaplanmış halde */
export function useEvaluatedProducts() {
  const products = useLiveQuery(listProducts, [])
  const catalog = useCatalog()
  const settings = useSettings()
  const items = useMemo<EvaluatedProduct[]>(
    () => (products ?? []).map((product) => ({ product, ev: evaluateProduct(product, catalog, settings) })),
    [products, catalog, settings],
  )
  return { items, catalog, loaded: !!products && catalog.loaded }
}

/** Yeni hesaplanan fiyatı kaydedilmiş satış fiyatı yap (snapshot + geçmiş) */
export async function applyCurrentPrice(item: EvaluatedProduct, settings: AppSettings) {
  const { product, ev } = item
  const isManual = product.saleSource === 'manual'
  const snapshot: ProductSnapshot = {
    at: Date.now(),
    settings: pricingSettings(settings),
    cost: ev.cost,
    priceA: ev.prices.a,
    priceB: ev.prices.b,
    manual: isManual ? evaluatePrice(ev.currentSalePrice, ev.cost, { ...settings, rounding: 'none' }) : product.snapshot.manual,
  }
  await setSalePrice(
    product.id,
    { source: product.saleSource, price: ev.currentSalePrice, manualPrice: isManual ? ev.currentSalePrice : undefined, snapshot },
    'apply',
  )
}

export function useProductActions() {
  const openProduct = useOpenProduct()
  const navigate = useNavigate()

  const remove = useCallback(async (p: Product, after?: () => void) => {
    const removed = await deleteProduct(p.id)
    after?.()
    if (removed) toast(`“${p.name}” silindi`, { action: { label: 'Geri al', onClick: () => void restoreProduct(removed) } })
  }, [])

  const menu = useCallback(
    (p: Product, opts: { afterDelete?: () => void } = {}): MenuItem[] => [
      { label: 'Hesapla’da düzenle', icon: Pencil, onSelect: () => void openProduct(p.id) },
      {
        label: 'Çoğalt',
        icon: Copy,
        onSelect: async () => {
          const copy = await duplicateProduct(p.id)
          if (copy) {
            toast(`“${copy.name}” oluşturuldu`, { tone: 'success' })
            navigate(`/urunler/${copy.id}`)
          }
        },
      },
      {
        label: p.archived ? 'Arşivden çıkar' : 'Arşivle',
        icon: p.archived ? ArchiveRestore : Archive,
        onSelect: async () => {
          await updateProduct(p.id, { archived: !p.archived })
          toast(p.archived ? `“${p.name}” arşivden çıkarıldı` : `“${p.name}” arşivlendi`, {
            action: { label: 'Geri al', onClick: () => void updateProduct(p.id, { archived: p.archived }) },
          })
        },
      },
      { label: 'Sil', icon: Trash2, danger: true, onSelect: () => void remove(p, opts.afterDelete) },
    ],
    [openProduct, navigate, remove],
  )

  return { menu, remove }
}
