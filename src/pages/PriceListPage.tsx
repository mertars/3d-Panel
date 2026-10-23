import { toBlob } from 'html-to-image'
import { Check, Download, Package, Printer, Search } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLayout } from '@/app/AppShell'
import { Badge, BlurInput, Button, EmptyState, Field, GlassCard, Input, Segmented, Skeleton, Switch } from '@/components/ui'
import { evaluateVariant } from '@/features/products/evaluate'
import { ProductThumb } from '@/features/products/ProductCard'
import { useEvaluatedProducts } from '@/features/products/useProducts'
import { PriceListSheet, SHEET_SIZE, STORY_MAX, type PriceListFormat, type PriceListRow } from '@/features/pricelist/PriceListSheet'
import { cn } from '@/lib/cn'
import { downloadBlob, isoDay } from '@/lib/download'
import { formatTL } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

const norm = (s: string) => s.toLocaleLowerCase('tr-TR')

export default function PriceListPage() {
  const { items, catalog, loaded } = useEvaluatedProducts()
  const settings = useSettings()
  const navigate = useNavigate()
  const { contentWidth } = useLayout()
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('Fiyat listesi')
  const [format, setFormat] = useState<PriceListFormat>('a4')
  const [withVariants, setWithVariants] = useState(true)
  const sheetRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  const active = useMemo(() => items.filter((i) => !i.product.archived), [items])
  const chosen = selected ?? new Set(active.map((i) => i.product.id))

  const rows = useMemo<PriceListRow[]>(
    () =>
      active
        .filter((i) => chosen.has(i.product.id))
        .flatMap(({ product: p }) => [
          { key: p.id, name: p.name, detail: p.category || undefined, price: p.salePrice, photo: p.photo },
          ...(withVariants
            ? p.variants.map((v) => ({ key: `${p.id}:${v.id}`, name: `${p.name} — ${v.name}`, detail: p.category || undefined, price: evaluateVariant(p, v, catalog, settings).salePrice, photo: p.photo }))
            : []),
        ]),
    [active, chosen, withVariants, catalog, settings],
  )

  // Önizleme: sabit boyutlu sayfayı kapsayıcıya sığacak şekilde küçült
  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / SHEET_SIZE[format].width))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [format, loaded, contentWidth])

  if (!loaded) return <Skeleton className="h-96 rounded-card" />
  if (active.length === 0) {
    return (
      <GlassCard className="mx-auto max-w-2xl" padded={false}>
        <EmptyState
          icon={<Package />}
          title="Listelenecek ürün yok"
          description="Fiyat listesi kayıtlı ürünlerinden oluşur. Önce Hesapla’da ürün kaydet."
          action={<Button variant="primary" onClick={() => navigate('/hesapla')}>Hesapla’ya git</Button>}
        />
      </GlassCard>
    )
  }

  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const visible = active.filter((i) => !query || norm(`${i.product.name} ${i.product.category}`).includes(norm(query)))

  async function png() {
    if (!sheetRef.current) return
    try {
      const blob = await toBlob(sheetRef.current, { pixelRatio: format === 'story' ? 1 : 2, cacheBust: true, backgroundColor: '#ffffff' })
      if (!blob) throw new Error('boş')
      downloadBlob(blob, `fiyat-listesi-${format === 'story' ? 'hikaye-' : ''}${isoDay()}`, 'png')
      toast('Fiyat listesi indirildi', { tone: 'success' })
    } catch {
      toast('Görsel oluşturulamadı', { tone: 'danger' })
    }
  }

  const size = SHEET_SIZE[format]
  const twoColumn = contentWidth >= 960

  const controls = (
    <div className="no-print flex min-w-0 flex-col gap-4">
      <GlassCard>
        <div className="grid gap-4">
          <Field label="Başlık" htmlFor="pl-title">
            <BlurInput id="pl-title" value={title} onCommit={setTitle} placeholder="ör. Ekim fiyat listesi" />
          </Field>
          <Field label="Biçim" htmlFor="pl-format">
            <Segmented<PriceListFormat>
              aria-label="Biçim"
              className="w-full"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'a4', label: 'A4 · yazdır' },
                { value: 'story', label: 'Hikâye 1080×1920' },
              ]}
            />
          </Field>
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm text-fg-2">Varyantları ayrı satır göster</span>
            <Switch checked={withVariants} onChange={setWithVariants} aria-label="Varyantları göster" />
          </label>
          {format === 'story' && rows.length > STORY_MAX && (
            <p className="text-xs text-warning">Hikâyeye ilk {STORY_MAX} satır sığar; {rows.length - STORY_MAX} satır “+ ürün daha” olarak belirtilir.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void png()} disabled={rows.length === 0}>
              <Download />
              PNG indir
            </Button>
            {format === 'a4' && (
              <Button onClick={() => window.print()} disabled={rows.length === 0}>
                <Printer />
                Yazdır / PDF
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Ürünler</h2>
          <Badge size="xs">
            {chosen.size}/{active.length} seçili
          </Badge>
        </div>
        <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ürün ara" aria-label="Fiyat listesinde ürün ara" type="search" />
        <div className="mt-2 flex gap-2 text-xs">
          <button type="button" className="min-h-9 text-brand-2 hover:underline" onClick={() => setSelected(new Set(active.map((i) => i.product.id)))}>
            tümünü seç
          </button>
          <button type="button" className="min-h-9 text-fg-3 hover:underline" onClick={() => setSelected(new Set())}>
            temizle
          </button>
        </div>
        <ul className="mt-1 flex max-h-[420px] flex-col gap-1 overflow-y-auto">
          {visible.map(({ product: p }) => {
            const on = chosen.has(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(p.id)}
                  className={cn('flex min-h-12 w-full min-w-0 items-center gap-3 rounded-ctl px-2 text-left', on ? 'bg-surface-strong' : 'hover:bg-surface')}
                >
                  <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border', on ? 'brand-gradient border-transparent text-white' : 'border-line-strong')}>
                    {on && <Check className="size-3.5" />}
                  </span>
                  <ProductThumb product={p} className="size-9 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="tnum shrink-0 text-sm font-medium">{formatTL(p.salePrice, { compactDecimals: true })}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </GlassCard>
    </div>
  )

  const preview = (
    <div className="min-w-0">
      <div className="no-print mb-2 text-xs text-fg-3">
        Önizleme · {size.width}×{size.height ?? 'A4'} · müşteriye yalnızca ad ve fiyat görünür
      </div>
      <div ref={previewRef} className="print-area w-full min-w-0">
        <div className="pricelist-frame overflow-hidden" style={{ height: (size.height ?? Math.max(1123, 300 + Math.ceil(rows.length / 3) * 290)) * scale }}>
          <div className="pricelist-scale origin-top-left" style={{ transform: `scale(${scale})`, width: size.width }}>
            <PriceListSheet ref={sheetRef} rows={rows} title={title} format={format} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  )

  return twoColumn ? (
    <div className="grid min-w-0 grid-cols-[minmax(300px,380px)_minmax(0,1fr)] items-start gap-5 print:block">
      {controls}
      {preview}
    </div>
  ) : (
    <div className="flex min-w-0 flex-col gap-4">
      {controls}
      {preview}
    </div>
  )
}
