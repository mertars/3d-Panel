import { Pencil, Plus, Shapes, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Dialog, DurationInput, Field, Input, NumberInput, Section, Select } from '@/components/ui'
import { newId, updateProduct, type Product, type ProductFilamentLine, type ProductVariant } from '@/db'
import { filamentOptions } from '@/features/calculator/filamentOptions'
import type { Catalog } from '@/features/calculator/draft'
import { formatHours, formatTL, parseGram } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import { evaluateVariant } from '../evaluate'
import { MarginBadge, Swatches } from '../ProductCard'
import { resolveFilament } from '@/features/calculator/draft'

const tl = (v: number) => formatTL(v, { compactDecimals: true })

type Line = ProductFilamentLine & { key: string }
interface FormState {
  name: string
  filaments: Line[]
  printHours: number | null
  unitsPerPlate: number | null
  laborMinutes: number | null
  priceOverride: number | null
}

const keyed = (lines: ProductFilamentLine[]): Line[] => lines.map((l) => ({ ...l, key: newId() }))

function fromVariant(v: ProductVariant): FormState {
  return { ...v, filaments: keyed(v.filaments) }
}

function fromProduct(p: Product): FormState {
  return {
    name: '',
    filaments: keyed(p.detailed.filaments.length ? p.detailed.filaments : [{ filamentId: '', gram: 0, purgeGram: 0 }]),
    printHours: p.detailed.printHours,
    unitsPerPlate: p.detailed.unitsPerPlate,
    laborMinutes: p.detailed.laborMinutes,
    priceOverride: null,
  }
}

function toVariant(id: string, f: FormState): ProductVariant {
  return {
    id,
    name: f.name.trim(),
    filaments: f.filaments.filter((l) => l.filamentId).map(({ filamentId, gram, purgeGram }) => ({ filamentId, gram, purgeGram })),
    printHours: f.printHours ?? 0,
    unitsPerPlate: Math.max(1, Math.round(f.unitsPerPlate ?? 1)),
    laborMinutes: f.laborMinutes ?? 0,
    priceOverride: f.priceOverride,
  }
}

function VariantDialog({
  open,
  onOpenChange,
  product,
  variant,
  catalog,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  product: Product
  variant: ProductVariant | null
  catalog: Catalog
}) {
  const settings = useSettings()
  const [f, setF] = useState<FormState>(() => (variant ? fromVariant(variant) : fromProduct(product)))
  const [error, setError] = useState<string | null>(null)
  const options = useMemo(() => filamentOptions(catalog), [catalog])

  useEffect(() => {
    if (open) {
      setF(variant ? fromVariant(variant) : fromProduct(product))
      setError(null)
    }
  }, [open, variant, product])

  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }))
  const setLine = (key: string, patch: Partial<Line>) => set({ filaments: f.filaments.map((l) => (l.key === key ? { ...l, ...patch } : l)) })
  const preview = evaluateVariant(product, toVariant('preview', f), catalog, settings)

  async function save() {
    if (!f.name.trim()) {
      setError('Varyant adı gerekli (ör. Büyük / Kırmızı)')
      return
    }
    const v = toVariant(variant?.id ?? newId(), f)
    const variants = variant ? product.variants.map((x) => (x.id === variant.id ? v : x)) : [...product.variants, v]
    await updateProduct(product.id, { variants })
    toast(variant ? 'Varyant güncellendi' : 'Varyant eklendi', { tone: 'success' })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={variant ? 'Varyantı düzenle' : 'Varyant ekle'}
      description="Aynı ürünün boy/renk seçeneği. İşçilik ücreti, ambalaj, ekler ve yazıcı ana üründen gelir."
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Varyant adı" htmlFor="v-name" error={error}>
          <Input id="v-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="ör. Büyük (15 cm) / Kırmızı" autoFocus />
        </Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-fg-2">Filament (gram · purge)</div>
          <div className="flex flex-col gap-2">
            {f.filaments.map((l, i) => (
              <div key={l.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 sm:grid-cols-[minmax(0,1fr)_96px_96px_44px]">
                <div className="col-span-3 min-w-0 sm:col-span-1">
                  <Select aria-label={`Varyant filament ${i + 1}`} value={l.filamentId} onChange={(filamentId) => setLine(l.key, { filamentId })} options={options} placeholder="Filament seç" />
                </div>
                <NumberInput aria-label={`Varyant filament ${i + 1} gram`} value={l.gram || null} onChange={(g) => setLine(l.key, { gram: g ?? 0 })} parse={parseGram} unit="g" placeholder="gram" />
                <NumberInput aria-label={`Varyant filament ${i + 1} purge`} value={l.purgeGram || null} onChange={(g) => setLine(l.key, { purgeGram: g ?? 0 })} parse={parseGram} unit="g" placeholder="purge" />
                <Button variant="ghost" size="icon" className="size-11" aria-label={`Filament ${i + 1} sil`} disabled={f.filaments.length === 1} onClick={() => set({ filaments: f.filaments.filter((x) => x.key !== l.key) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" onClick={() => set({ filaments: [...f.filaments, { key: newId(), filamentId: catalog.filamentTypes[0]?.id ?? '', gram: 0, purgeGram: 0 }] })}>
            <Plus />
            Satır ekle
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Baskı süresi" htmlFor="v-hours">
            <DurationInput id="v-hours" value={f.printHours} onChange={(printHours) => set({ printHours })} />
          </Field>
          <Field label="Plaka başı adet" htmlFor="v-units">
            <NumberInput id="v-units" value={f.unitsPerPlate} onChange={(unitsPerPlate) => set({ unitsPerPlate })} unit="adet" min={1} />
          </Field>
          <Field label="El emeği" htmlFor="v-labor">
            <NumberInput id="v-labor" value={f.laborMinutes} onChange={(laborMinutes) => set({ laborMinutes })} unit="dk" step={5} />
          </Field>
          <Field label="Özel satış fiyatı" htmlFor="v-price" hint={`Boşsa ürünün kaynağına göre ${product.saleSource === 'b' ? 'Fiyat B' : 'Fiyat A'}`}>
            <NumberInput id="v-price" value={f.priceOverride} onChange={(priceOverride) => set({ priceOverride })} unit="₺" step={10} placeholder="otomatik" />
          </Field>
        </div>
        <div className="inset-surface tnum grid grid-cols-4 gap-2 rounded-[14px] px-4 py-3 text-xs">
          <div className="min-w-0">
            <div className="text-fg-3">Maliyet</div>
            <div className="truncate font-semibold">{tl(preview.cost.totalCost)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-fg-3">A</div>
            <div className="truncate font-semibold">{tl(preview.prices.a.rounded)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-fg-3">B</div>
            <div className="truncate font-semibold">{tl(preview.prices.b.rounded)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-fg-3">Satış</div>
            <div className="truncate font-bold">{tl(preview.salePrice)}</div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/** Varyantlar: aynı ürünün boy/renk seçenekleri, her biri kendi gram/süresiyle */
export function VariantsCard({ product, catalog }: { product: Product; catalog: Catalog }) {
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductVariant | null>(null)

  async function remove(v: ProductVariant) {
    const prev = product.variants
    await updateProduct(product.id, { variants: prev.filter((x) => x.id !== v.id) })
    toast(`“${v.name}” varyantı silindi`, { action: { label: 'Geri al', onClick: () => void updateProduct(product.id, { variants: prev }) } })
  }

  return (
    <Section
      title="Varyantlar"
      description="Boy veya renk seçenekleri — her biri kendi filament ve süresiyle fiyatlanır."
      icon={<Shapes className="size-4" />}
      actions={
        product.mode === 'detailed' && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus />
            Ekle
          </Button>
        )
      }
    >
      {product.mode === 'quick' ? (
        <p className="text-sm text-fg-3">Varyantlar detaylı modda hesaplanan ürünlerde kullanılabilir. Ürünü Hesapla’da detaylı moda geçirip kaydet.</p>
      ) : product.variants.length === 0 ? (
        <p className="text-sm text-fg-3">Henüz varyant yok. “Ekle” ana ürünün değerleriyle başlar; sadece farkları değiştirmen yeterli.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {product.variants.map((v) => {
            const ev = evaluateVariant(product, v, catalog, settings)
            const colors = Array.from(new Set(v.filaments.map((l) => resolveFilament(l.filamentId, catalog)?.color).filter((c): c is string => !!c)))
            return (
              <li key={v.id} className="inset-surface flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] py-2.5 pr-1.5 pl-4">
                <div className="min-w-0 flex-[1_1_160px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{v.name}</span>
                    <Swatches colors={colors} size={14} />
                  </div>
                  <div className="tnum truncate text-xs text-fg-3">
                    {formatHours(ev.cost.hoursPerUnit)} · maliyet {tl(ev.cost.totalCost)} · A {tl(ev.prices.a.rounded)} · B {tl(ev.prices.b.rounded)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.priceOverride !== null && <Badge size="xs">özel</Badge>}
                  <span className="tnum text-[15px] font-bold">{tl(ev.salePrice)}</span>
                  <MarginBadge margin={ev.sale.metrics.margin} />
                </div>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${v.name} düzenle`}
                    onClick={() => {
                      setEditing(v)
                      setOpen(true)
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`${v.name} sil`} onClick={() => void remove(v)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <VariantDialog open={open} onOpenChange={setOpen} product={product} variant={editing} catalog={catalog} />
    </Section>
  )
}
