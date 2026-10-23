import { useLiveQuery } from 'dexie-react-hooks'
import { toBlob } from 'html-to-image'
import { ArrowLeft, Check, ClipboardCopy, Download, FileText, PackagePlus, Plus, Printer, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLayout } from '@/app/AppShell'
import { Badge, BlurInput, Button, EmptyState, Field, GlassCard, Input, NumberInput, Segmented, Select, Skeleton, Textarea, Tooltip } from '@/components/ui'
import { deleteQuote, getQuote, listProducts, restoreQuote, saveQuote, type Product, type Quote, type QuoteItem, type QuoteStatus } from '@/db'
import { useCatalog } from '@/features/calculator/useCalculation'
import { evaluateVariant } from '@/features/products/evaluate'
import { customItem, quoteItemFor, quoteText, quoteTotal, STATUS_LABEL, withQuantity } from '@/features/quotes/actions'
import { QuoteCard } from '@/features/quotes/QuoteCard'
import { fileSlug, formatTL } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

const SAVE_DELAY = 400

export default function QuoteEditorPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const catalog = useCatalog()
  const { contentWidth } = useLayout()
  const products = useLiveQuery(listProducts, [], [] as Product[])
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined)
  const [saved, setSaved] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const pending = useRef<Quote | null>(null)
  const timer = useRef<number | undefined>(undefined)

  // İlk yükleme (sonrasında kaynak yerel durum; otomatik kaydedilir)
  useEffect(() => {
    let alive = true
    void getQuote(id).then((q) => alive && setQuote(q ?? null))
    return () => {
      alive = false
    }
  }, [id])

  // Sayfadan çıkarken bekleyen kaydı yaz
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current) void saveQuote(pending.current)
    },
    [],
  )

  function change(patch: Partial<Quote>) {
    setQuote((q) => {
      if (!q) return q
      const next = { ...q, ...patch }
      pending.current = next
      setSaved(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(async () => {
        await saveQuote(next)
        pending.current = null
        setSaved(true)
      }, SAVE_DELAY)
      return next
    })
  }

  /** Kalemin indirimsiz fiyatı (ürün veya varyant satış fiyatı) */
  function basePrice(item: QuoteItem): number | null {
    const p = item.productId ? productMap.get(item.productId) : undefined
    if (!p) return null
    const v = item.variantId ? p.variants.find((x) => x.id === item.variantId) : undefined
    return v ? evaluateVariant(p, v, catalog, settings).salePrice : p.salePrice
  }

  const pickerOptions = useMemo(
    () =>
      products
        .filter((p) => !p.archived)
        .flatMap((p) => [
          { value: `p:${p.id}`, label: p.name, description: formatTL(p.salePrice, { compactDecimals: true }) },
          ...p.variants.map((v) => ({
            value: `v:${p.id}:${v.id}`,
            label: `${p.name} — ${v.name}`,
            description: catalog.loaded ? formatTL(evaluateVariant(p, v, catalog, settings).salePrice, { compactDecimals: true }) : '',
          })),
        ]),
    [products, catalog, settings],
  )

  if (quote === undefined) return <Skeleton className="h-96 rounded-card" />
  if (quote === null) {
    return (
      <GlassCard className="mx-auto max-w-2xl" padded={false}>
        <EmptyState
          icon={<FileText />}
          title="Teklif bulunamadı"
          description="Silinmiş olabilir."
          action={
            <Button onClick={() => navigate('/teklifler')}>
              <ArrowLeft />
              Teklifler
            </Button>
          }
        />
      </GlassCard>
    )
  }

  const q = quote
  const setItem = (key: string, next: QuoteItem) => change({ items: q.items.map((i) => (i.key === key ? next : i)) })

  function addFromPicker(value: string) {
    const [kind, pid, vid] = value.split(':')
    const p = productMap.get(pid)
    if (!p) return
    if (kind === 'v') {
      const v = p.variants.find((x) => x.id === vid)
      if (!v) return
      change({ items: [...q.items, quoteItemFor(p, settings.bulkTiers, 1, { id: v.id, name: v.name, price: evaluateVariant(p, v, catalog, settings).salePrice })] })
    } else {
      change({ items: [...q.items, quoteItemFor(p, settings.bulkTiers)] })
    }
  }

  async function downloadPng() {
    if (!cardRef.current) return
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' })
      if (!blob) throw new Error('boş görsel')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileSlug([q.number, q.customer].filter(Boolean).join('-')) || 'teklif'}.png`
      // Belgeye eklenmemiş bağlantıda bazı tarayıcılar dosya adını yok sayar
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast('Teklif görseli indirildi', { tone: 'success' })
    } catch {
      toast('Görsel oluşturulamadı', { tone: 'danger' })
    }
  }

  async function copyText() {
    const text = quoteText(q, settings, settings.bulkTiers)
    try {
      await navigator.clipboard.writeText(text)
      toast('Metin kopyalandı — WhatsApp/Instagram’a yapıştırabilirsin', { tone: 'success' })
    } catch {
      toast('Kopyalanamadı; tarayıcı panoya erişime izin vermedi', { tone: 'danger' })
    }
  }

  async function remove() {
    window.clearTimeout(timer.current)
    pending.current = null
    const removed = await deleteQuote(q.id)
    navigate('/teklifler')
    if (removed) toast(`${q.number} silindi`, { action: { label: 'Geri al', onClick: () => void restoreQuote(removed) } })
  }

  const twoColumn = contentWidth >= 1000

  const editor = (
    <div className="no-print flex min-w-0 flex-col gap-4">
      <GlassCard>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/teklifler" className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
            <ArrowLeft className="size-3.5" /> Teklifler
          </Link>
          <span className="tnum text-xs text-fg-3">· {q.number}</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-fg-3" aria-live="polite">
            {saved ? (
              <>
                <Check className="size-3.5 text-success" /> kaydedildi
              </>
            ) : (
              'kaydediliyor…'
            )}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Müşteri adı" htmlFor="q-customer" className="sm:col-span-2">
            <Input id="q-customer" value={q.customer} onChange={(e) => change({ customer: e.target.value })} placeholder="ör. Ayşe Yılmaz" />
          </Field>
          <Field label="Geçerlilik tarihi" htmlFor="q-valid">
            <Input id="q-valid" type="date" value={q.validUntil} onChange={(e) => e.target.value && change({ validUntil: e.target.value })} />
          </Field>
          <Field label="Teslim süresi" htmlFor="q-lead">
            <Input id="q-lead" value={q.leadTime} onChange={(e) => change({ leadTime: e.target.value })} placeholder="ör. 3–5 iş günü" />
          </Field>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 text-[13px] font-medium text-fg-2">Durum</div>
          <div className="hide-scrollbar max-w-full overflow-x-auto">
            <Segmented<QuoteStatus>
              aria-label="Teklif durumu"
              size="sm"
              value={q.status}
              onChange={(status) => change({ status })}
              options={(['draft', 'sent', 'accepted', 'rejected'] as const).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
          </div>
          {q.status === 'accepted' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tooltip content="Siparişler Parça 3’te geliyor">
                <span tabIndex={0}>
                  <Button size="sm" disabled>
                    <ShoppingBag />
                    Siparişe dönüştür
                  </Button>
                </span>
              </Tooltip>
              <Badge size="xs">yakında</Badge>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Kalemler</h2>
          <span className="tnum text-sm font-semibold">{formatTL(quoteTotal(q))}</span>
        </div>
        <div className="flex flex-col gap-2">
          {q.items.map((i, idx) => {
            const base = basePrice(i)
            return (
              <div key={i.key} className="inset-surface grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-2 rounded-[14px] p-2.5">
                <BlurInput aria-label={`Kalem ${idx + 1} adı`} value={i.name} onCommit={(name) => setItem(i.key, { ...i, name })} placeholder="Kalem adı" />
                <Button variant="ghost" size="icon" className="size-11" aria-label={`Kalem ${idx + 1} sil`} onClick={() => change({ items: q.items.filter((x) => x.key !== i.key) })}>
                  <Trash2 />
                </Button>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <NumberInput
                    aria-label={`Kalem ${idx + 1} adet`}
                    value={i.quantity}
                    onChange={(v) => setItem(i.key, withQuantity(i, v ?? 1, base, settings.bulkTiers))}
                    unit="adet"
                    min={1}
                  />
                  <NumberInput
                    aria-label={`Kalem ${idx + 1} birim fiyat`}
                    value={i.unitPrice}
                    onChange={(v) => setItem(i.key, { ...i, unitPrice: v ?? 0, priceLocked: true })}
                    unit="₺"
                    step={10}
                  />
                </div>
                <div className="tnum col-span-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-fg-3">
                  <span>
                    {i.productId ? (base !== null ? `satış fiyatı ${formatTL(base)}` : 'ürün silinmiş') : 'özel kalem'}
                    {i.priceLocked && i.productId && (
                      <button
                        type="button"
                        className="ml-2 text-brand-2 hover:underline"
                        onClick={() => setItem(i.key, withQuantity({ ...i, priceLocked: false }, i.quantity, base, settings.bulkTiers))}
                      >
                        otomatik fiyata dön
                      </button>
                    )}
                  </span>
                  <span className="text-fg-2">{formatTL(i.unitPrice * i.quantity)}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          {pickerOptions.length > 0 ? (
            <Select key={q.items.length} aria-label="Ürün ekle" value="" onChange={addFromPicker} options={pickerOptions} placeholder="+ Ürün veya varyant ekle" />
          ) : (
            <div className="inset-surface flex h-11 items-center gap-2 rounded-ctl px-3 text-sm text-fg-3">
              <PackagePlus className="size-4" /> Kayıtlı ürün yok — özel kalem ekleyebilirsin
            </div>
          )}
          <Button onClick={() => change({ items: [...q.items, customItem()] })}>
            <Plus />
            Özel kalem
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-fg-3">Ürün kalemlerinde birim fiyat, Ayarlar’daki toplu adet indirimine göre otomatik hesaplanır; elle değiştirirsen sabitlenir.</p>
      </GlassCard>

      <GlassCard>
        <Field label="Not (müşteri görür)" htmlFor="q-note">
          <Textarea id="q-note" value={q.note} onChange={(e) => change({ note: e.target.value })} placeholder="ör. Kargo ücreti alıcıya aittir. Renk seçenekleri için mesaj atabilirsiniz." />
        </Field>
        <Button variant="danger" size="sm" className="mt-4" onClick={() => void remove()}>
          <Trash2 />
          Teklifi sil
        </Button>
      </GlassCard>
    </div>
  )

  const preview = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void downloadPng()}>
          <Download />
          PNG indir
        </Button>
        <Button onClick={() => void copyText()}>
          <ClipboardCopy />
          Metni kopyala
        </Button>
        <Button onClick={() => window.print()}>
          <Printer />
          Yazdır / PDF
        </Button>
      </div>
      <div className="print-area min-w-0">
        <QuoteCard ref={cardRef} quote={q} settings={settings} products={productMap} />
      </div>
      <p className="no-print text-xs text-fg-3">Önizleme müşterinin göreceği haliyle: maliyet ve kâr bilgisi yer almaz.</p>
    </div>
  )

  return twoColumn ? (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-5 print:block">
      {editor}
      <div className="sticky top-[88px] min-w-0">{preview}</div>
    </div>
  ) : (
    <div className="flex min-w-0 flex-col gap-4">
      {editor}
      {preview}
    </div>
  )
}
