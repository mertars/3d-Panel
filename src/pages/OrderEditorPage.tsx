import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, CircleAlert, CircleCheck, ClipboardList, PackagePlus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLayout } from '@/app/AppShell'
import { Badge, BlurInput, Button, ColorSwatch, EmptyState, Field, GlassCard, Input, NumberInput, Segmented, Select, Skeleton, StatCard, Switch, Textarea } from '@/components/ui'
import { deleteOrder, getOrder, listChannels, listProducts, ORDER_STATUSES, restoreOrder, saveOrder, type Order, type OrderItem, type OrderStatus, type Product } from '@/db'
import { resolveFilament } from '@/features/calculator/draft'
import { useCatalog } from '@/features/calculator/useCalculation'
import { changeStatus } from '@/features/orders/actions'
import { customOrderItem, itemFromProduct, totalsFor } from '@/features/orders/items'
import { formatDate, formatGram, formatHours, formatPercent, formatTL } from '@/lib/format'
import { filamentNeeds, stockCheck, type StockRef } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

const SAVE_DELAY = 400

export default function OrderEditorPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const catalog = useCatalog()
  const { contentWidth } = useLayout()
  const products = useLiveQuery(listProducts, [], [] as Product[])
  const channels = useLiveQuery(listChannels, [], [])
  // Durum ve stok kaydı dışarıdan (pano, geri al) değişebilir → canlı izlenir
  const live = useLiveQuery(() => getOrder(id).then((o) => o ?? null), [id])
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [saved, setSaved] = useState(true)
  const pending = useRef<Order | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (live === undefined) return
    if (live === null) return setOrder(null)
    // Düzenleme sürerken yerel alanları ezme; yalnızca durum ve stok kaydını al
    setOrder((cur) => (cur && pending.current ? { ...cur, status: live.status, consumption: live.consumption } : live))
  }, [live])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current) void saveOrder(pending.current)
    },
    [],
  )

  function change(patch: Partial<Order>) {
    setOrder((o) => {
      if (!o) return o
      const next = { ...o, ...patch }
      pending.current = next
      setSaved(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(async () => {
        const toSave = pending.current
        if (!toSave) return
        await saveOrder(toSave)
        if (pending.current === toSave) pending.current = null
        setSaved(true)
      }, SAVE_DELAY)
      return next
    })
  }

  const pickerOptions = useMemo(
    () =>
      products
        .filter((p) => !p.archived)
        .flatMap((p) => [
          { value: `p:${p.id}`, label: p.name, description: formatTL(p.salePrice, { compactDecimals: true }) },
          ...p.variants.map((v) => ({ value: `v:${p.id}:${v.id}`, label: `${p.name} — ${v.name}` })),
        ]),
    [products],
  )

  const resolve = useMemo(() => {
    const spoolIds = new Set(catalog.spools.map((s) => s.id))
    const typeIds = new Set(catalog.filamentTypes.map((t) => t.id))
    return (fid: string): StockRef => {
      if (spoolIds.has(fid)) return { kind: 'spool', spoolId: fid }
      const t = fid.startsWith('avg:') ? fid.slice(4) : fid
      return typeIds.has(t) ? { kind: 'type', typeId: t } : { kind: 'none' }
    }
  }, [catalog])

  if (order === undefined || !catalog.loaded) return <Skeleton className="h-96 rounded-card" />
  if (order === null) {
    return (
      <GlassCard className="mx-auto max-w-2xl" padded={false}>
        <EmptyState
          icon={<ClipboardList />}
          title="Sipariş bulunamadı"
          description="Silinmiş olabilir."
          action={
            <Button onClick={() => navigate('/siparisler')}>
              <ArrowLeft />
              Siparişler
            </Button>
          }
        />
      </GlassCard>
    )
  }

  const o = order
  const totals = totalsFor(o, channels, settings)
  const needs = filamentNeeds(o.items)
  const stock = stockCheck(needs, catalog.spools, resolve)
  const setItem = (key: string, next: OrderItem) => change({ items: o.items.map((i) => (i.key === key ? next : i)) })

  function addFromPicker(value: string) {
    const [kind, pid, vid] = value.split(':')
    const p = products.find((x) => x.id === pid)
    if (!p) return
    const v = kind === 'v' ? (p.variants.find((x) => x.id === vid) ?? null) : null
    change({ items: [...o.items, itemFromProduct(p, v, 1, catalog, settings)] })
  }

  async function setStatus(status: OrderStatus) {
    // Önce bekleyen alan değişikliklerini yaz ki stok doğru kalemlerle düşülsün
    window.clearTimeout(timer.current)
    if (pending.current) {
      await saveOrder(pending.current)
      pending.current = null
      setSaved(true)
    }
    await changeStatus(o, status)
  }

  async function remove() {
    window.clearTimeout(timer.current)
    pending.current = null
    const removed = await deleteOrder(o.id)
    navigate('/siparisler')
    if (removed) toast(`${o.number} silindi${removed.consumption ? ' · filament stoğa iade edildi' : ''}`, { action: { label: 'Geri al', onClick: () => void restoreOrder(removed) } })
  }

  const twoColumn = contentWidth >= 960

  const editor = (
    <div className="flex min-w-0 flex-col gap-4">
      <GlassCard>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/siparisler" className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
            <ArrowLeft className="size-3.5" /> Siparişler
          </Link>
          <span className="tnum text-xs text-fg-3">· {o.number} · {formatDate(o.createdAt)}</span>
          {o.quoteId && <Badge size="xs">tekliften</Badge>}
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
        <div className="mt-4">
          <div className="mb-1.5 text-[13px] font-medium text-fg-2">Durum</div>
          <div className="hide-scrollbar max-w-full overflow-x-auto">
            <Segmented<OrderStatus> aria-label="Sipariş durumu" size="sm" value={o.status} onChange={(s) => void setStatus(s)} options={ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
          </div>
          <p className="mt-2 text-xs text-fg-3">
            {o.consumption
              ? `Filament stoktan düşüldü, yazıcı saatine eklendi (${formatDate(o.consumption.at)}). Yeni/İptal’e alırsan geri alınır.`
              : `Stok, sipariş “${settings.consumeOn === 'printing' ? 'Baskıda' : 'Teslim edildi'}” olunca düşülür (Ayarlar’dan değişir).`}
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Müşteri adı" htmlFor="o-customer">
            <Input id="o-customer" value={o.customer} onChange={(e) => change({ customer: e.target.value })} placeholder="ör. Ayşe Yılmaz" />
          </Field>
          <Field label="İletişim (isteğe bağlı)" htmlFor="o-contact">
            <Input id="o-contact" value={o.contact} onChange={(e) => change({ contact: e.target.value })} placeholder="telefon, @instagram, e-posta" />
          </Field>
          <Field label="Kanal" htmlFor="o-channel">
            <Select
              id="o-channel"
              value={o.channelId ?? 'none'}
              onChange={(v) => change({ channelId: v === 'none' ? null : v })}
              options={[{ value: 'none', label: 'Kanal yok (komisyonsuz)' }, ...channels.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </Field>
          <Field label="Teslim tarihi" htmlFor="o-due">
            <Input id="o-due" type="date" value={o.dueDate ?? ''} onChange={(e) => change({ dueDate: e.target.value || null })} />
          </Field>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Ürünler</h2>
          <span className="tnum text-sm font-semibold">{formatTL(totals.gross)}</span>
        </div>
        <div className="flex flex-col gap-2">
          {o.items.map((i, idx) => (
            <div key={i.key} className="inset-surface grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-2 rounded-[14px] p-2.5">
              <BlurInput aria-label={`Kalem ${idx + 1} adı`} value={i.name} onCommit={(name) => setItem(i.key, { ...i, name })} placeholder="Kalem adı" />
              <Button variant="ghost" size="icon" className="size-11" aria-label={`Kalem ${idx + 1} sil`} onClick={() => change({ items: o.items.filter((x) => x.key !== i.key) })}>
                <Trash2 />
              </Button>
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <NumberInput aria-label={`Kalem ${idx + 1} adet`} value={i.quantity} onChange={(v) => setItem(i.key, { ...i, quantity: Math.max(1, Math.round(v ?? 1)) })} unit="adet" min={1} />
                <NumberInput aria-label={`Kalem ${idx + 1} birim fiyat`} value={i.unitPrice} onChange={(v) => setItem(i.key, { ...i, unitPrice: v ?? 0 })} unit="₺" step={10} />
              </div>
              <div className="tnum col-span-2 flex flex-wrap justify-between gap-2 px-1 text-[11px] text-fg-3">
                <span>
                  {i.productId ? `maliyet ${formatTL(i.unitCost)} · ${formatHours(i.hoursPerUnit)}/adet` : 'özel kalem (maliyet 0)'}
                </span>
                <span className="text-fg-2">{formatTL(i.unitPrice * i.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          {pickerOptions.length > 0 ? (
            <Select key={o.items.length} aria-label="Ürün ekle" value="" onChange={addFromPicker} options={pickerOptions} placeholder="+ Ürün veya varyant ekle" />
          ) : (
            <div className="inset-surface flex h-11 items-center gap-2 rounded-ctl px-3 text-sm text-fg-3">
              <PackagePlus className="size-4" /> Kayıtlı ürün yok
            </div>
          )}
          <Button onClick={() => change({ items: [...o.items, customOrderItem()] })}>
            <Plus />
            Özel kalem
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-fg-3">Birim fiyat ürünün satış fiyatıyla gelir, değiştirebilirsin. Maliyet ve filament bilgisi eklendiği andaki hesaptan saklanır.</p>
      </GlassCard>

      <GlassCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="İndirim" htmlFor="o-disc">
            <NumberInput id="o-disc" value={o.discount || null} onChange={(v) => change({ discount: v ?? 0 })} unit="₺" step={10} placeholder="0" />
          </Field>
          <Field label="Kargoyu kim ödüyor?" htmlFor="o-ship-payer">
            <Segmented<'customer' | 'seller'>
              aria-label="Kargoyu kim ödüyor"
              className="w-full"
              value={o.shippingPayer}
              onChange={(shippingPayer) => change({ shippingPayer })}
              options={[
                { value: 'customer', label: 'Müşteri' },
                { value: 'seller', label: 'Ben' },
              ]}
            />
          </Field>
          {o.shippingPayer === 'seller' && (
            <Field label="Kargo tutarı" htmlFor="o-ship">
              <NumberInput id="o-ship" value={o.shippingCost || null} onChange={(v) => change({ shippingCost: v ?? 0 })} unit="₺" step={5} placeholder="0" />
            </Field>
          )}
          <label className="flex min-h-11 items-center justify-between gap-3 self-end">
            <span className="text-sm text-fg-2">Ödeme alındı</span>
            <Switch checked={o.paid} onChange={(paid) => change({ paid })} aria-label="Ödeme alındı" />
          </label>
          <Field label="Not" htmlFor="o-note" className="sm:col-span-2">
            <Textarea id="o-note" value={o.note} onChange={(e) => change({ note: e.target.value })} className="min-h-16" placeholder="ör. Hediye paketi, kırmızı kurdele" />
          </Field>
        </div>
        <Button variant="danger" size="sm" className="mt-4" onClick={() => void remove()}>
          <Trash2 />
          Siparişi sil
        </Button>
      </GlassCard>
    </div>
  )

  const summary = (
    <div className="flex min-w-0 flex-col gap-4">
      <GlassCard>
        <h2 className="text-[15px] font-semibold">Sipariş özeti</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatCard label="Ciro" value={formatTL(totals.revenue)} hint={totals.discount ? `indirim −${formatTL(totals.discount)}` : undefined} />
          <StatCard label="Kanal kesintisi" value={formatTL(totals.channelFee)} />
          <StatCard label="Toplam maliyet" value={formatTL(totals.cost)} hint={totals.sellerShipping ? `+ kargo ${formatTL(totals.sellerShipping)}` : undefined} />
          <StatCard label="Net kâr" value={formatTL(totals.netProfit)} tone={totals.netProfit < 0 ? 'danger' : 'success'} hint={`marj ${formatPercent(totals.margin)}`} />
          <StatCard label="Baskı saati" value={totals.hours > 0 ? formatHours(totals.hours) : '—'} />
          <StatCard label="Adet" value={totals.units} />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-[15px] font-semibold">Filament yeter mi?</h2>
        {stock.length === 0 ? (
          <p className="mt-2 text-sm text-fg-3">Bu siparişte filament bilgisi olan ürün yok.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {stock.map((l) => {
              const r = resolveFilament(l.filamentId, catalog)
              const short = !l.ok && !o.consumption
              return (
                <li key={l.filamentId} className={`flex min-w-0 items-center gap-3 rounded-[12px] border px-3 py-2 ${short ? 'border-danger/35 bg-danger/8' : 'border-line bg-inset'}`}>
                  <ColorSwatch color={r?.color ?? '#888'} size={24} className="text-fg-3" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{r?.name ?? 'Silinmiş filament'}</div>
                    <div className="tnum text-xs text-fg-3">
                      gerekli {formatGram(l.need)} · stokta {formatGram(l.available)}
                    </div>
                  </div>
                  {o.consumption ? (
                    <Badge size="xs">düşüldü</Badge>
                  ) : l.ok ? (
                    <CircleCheck className="size-5 shrink-0 text-success" aria-label="Yeterli" />
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-danger">
                      <CircleAlert className="size-4" /> yetmiyor
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {o.consumption && o.consumption.missing.length > 0 && (
          <p className="mt-2 text-xs text-danger">Stok düşülürken {formatGram(o.consumption.missing.reduce((s, m) => s + m.grams, 0))} filament stokta yoktu.</p>
        )}
        <p className="mt-2 text-[11px] text-fg-3">Toplam {formatGram([...needs.values()].reduce((s, g) => s + g, 0))} filament (purge dahil).</p>
      </GlassCard>
    </div>
  )

  return twoColumn ? (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(320px,380px)] items-start gap-5">
      {editor}
      <div className="sticky top-[88px] min-w-0">{summary}</div>
    </div>
  ) : (
    <div className="flex min-w-0 flex-col gap-4">
      {editor}
      {summary}
    </div>
  )
}
