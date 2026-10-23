import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, BarChart3, Calculator, ClipboardList, Disc3, Gauge, LayoutDashboard, Plus, Target, TriangleAlert, Wand2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge, Button, ColorSwatch, EmptyState, Field, GlassCard, Input, ProgressBar, Segmented, Skeleton, StatCard } from '@/components/ui'
import { createOrder, listSpools } from '@/db'
import { resolveFilament } from '@/features/calculator/draft'
import {
  changePercent,
  channelShares,
  filamentUsage,
  lifetimeProfit,
  monthlySeries,
  pendingHours,
  periodStats,
  previousRange,
  rangeFor,
  topSellers,
  type RangeKey,
} from '@/features/dashboard/analytics'
import { BarList, ChannelDonut, MonthlyChart, SERIES } from '@/features/dashboard/Charts'
import { STATUS_LABEL, STATUS_TONE, useOrdersData } from '@/features/orders/actions'
import { DueBadge } from '@/features/orders/OrderCard'
import { useEvaluatedProducts } from '@/features/products/useProducts'
import { formatGram, formatHours, formatNumber, formatPercent, formatTL } from '@/lib/format'
import { isLowStock, monthlyCapacityHours, salesToBreakEven } from '@/lib/pricing'
import { useSettings } from '@/store/settings'

const tl = (v: number) => formatTL(v, { compactDecimals: true })

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'thisMonth', label: 'Bu ay' },
  { value: 'lastMonth', label: 'Geçen ay' },
  { value: 'last90', label: 'Son 90 gün' },
  { value: 'thisYear', label: 'Bu yıl' },
  { value: 'custom', label: 'Özel' },
]

function change(cur: number, prev: number, points = false) {
  const v = points ? cur - prev : changePercent(cur, prev)
  if (v === null) return { label: 'yeni', tone: 'info' as const }
  if (Math.abs(v) < 0.05) return { label: '±0', tone: 'neutral' as const }
  const sign = v > 0 ? '+' : '−'
  const label = points ? `${sign}${formatNumber(Math.abs(v), 1)} puan` : `${sign}%${formatNumber(Math.abs(v), 0)}`
  return { label, tone: v > 0 ? ('success' as const) : ('danger' as const) }
}

function Card({ title, icon, children, action, className }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <GlassCard className={className}>
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <span className="text-brand-2 [&_svg]:size-4">{icon}</span>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { orders, channels, catalog, loaded } = useOrdersData()
  const { items: products, loaded: productsLoaded } = useEvaluatedProducts()
  const spools = useLiveQuery(listSpools, [], [])
  const settings = useSettings()
  const navigate = useNavigate()
  const [rangeKey, setRangeKey] = useState<RangeKey>('thisMonth')
  const [custom, setCustom] = useState(() => {
    const to = new Date()
    const from = new Date(to.getTime() - 29 * 86400000)
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
  })

  const range = useMemo(() => rangeFor(rangeKey, new Date(), custom), [rangeKey, custom])
  const prevRange = useMemo(() => previousRange(rangeKey, range), [rangeKey, range])

  const data = useMemo(() => {
    const cur = periodStats(orders, range)
    const prev = periodStats(orders, prevRange)
    const channelName = (id: string | null) => channels.find((c) => c.id === id)?.name ?? 'Kanalsız'
    const shares = channelShares(orders, range, channelName)
    const productName = (id: string) => products.find((p) => p.product.id === id)?.product.name
    const usage = [...filamentUsage(orders, range)]
      .map(([id, grams]) => {
        const r = resolveFilament(id, catalog)
        return { key: id, label: r?.name ?? 'Silinmiş filament', value: grams, swatch: r?.color }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    return {
      cur,
      prev,
      months: monthlySeries(orders, range),
      shares,
      top: topSellers(orders, range, productName),
      usage,
    }
  }, [orders, range, prevRange, channels, products, catalog])

  if (!loaded || !productsLoaded) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-11 w-full max-w-lg" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  if (orders.length === 0 && products.length === 0) {
    return (
      <GlassCard className="mx-auto max-w-3xl" padded={false}>
        <EmptyState
          icon={<LayoutDashboard />}
          title="Kâr panon burada olacak"
          description="Ürünlerini fiyatlayıp siparişleri girdikçe ciro, net kâr, kanal dağılımı ve kapasite burada görünür. Hemen denemek istersen örnek verilerle doldurabilirsin."
          action={
            <>
              <Button variant="primary" onClick={() => navigate('/hesapla')}>
                <Calculator />
                İlk ürünü fiyatla
              </Button>
              <Button onClick={() => navigate('/ayarlar#veri')}>
                <Wand2 />
                Örnek veriler (Ayarlar)
              </Button>
            </>
          }
        />
      </GlassCard>
    )
  }

  const { cur, prev } = data
  const pending = orders.filter(({ order }) => ['new', 'printing', 'ready'].includes(order.status)).sort((a, b) => (a.order.dueDate ?? '9999').localeCompare(b.order.dueDate ?? '9999'))
  const lowStock = spools.filter((s) => isLowStock(s.remainingGrams, settings.lowStockGrams))
  const stale = products.filter((p) => p.ev.drift.stale && !p.product.archived).length
  const topPerHour = products
    .filter((p) => !p.product.archived && p.ev.sale.metrics.profitPerHour !== null)
    .sort((a, b) => (b.ev.sale.metrics.profitPerHour ?? 0) - (a.ev.sale.metrics.profitPerHour ?? 0))
    .slice(0, 5)

  // Kapasite
  const printers = catalog.printers.length
  const hoursPerDay = settings.printerHoursPerDay
  const capacity = monthlyCapacityHours(printers, hoursPerDay)
  const pendingH = pendingHours(orders)
  const daysOfWork = printers > 0 ? pendingH / (printers * hoursPerDay) : null

  // Başa baş
  const investment = catalog.printers.reduce((s, p) => s + p.price, 0)
  const life = lifetimeProfit(orders)
  const avgProfit =
    life.units > 0
      ? life.netProfit / life.units
      : products.length
        ? products.reduce((s, p) => s + p.ev.sale.metrics.profit, 0) / products.length
        : 0
  const remainingSales = salesToBreakEven(investment, life.netProfit, avgProfit)
  const colorOf = (key: string) => {
    const idx = key === 'none' ? channels.length : channels.findIndex((c) => c.id === key)
    return SERIES[(idx < 0 ? channels.length : idx) % SERIES.length]
  }

  return (
    <div className="@container flex min-w-0 flex-col gap-4 lg:gap-5">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="hide-scrollbar -mx-4 max-w-[calc(100%+32px)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
          <Segmented<RangeKey> aria-label="Tarih aralığı" size="sm" value={rangeKey} onChange={setRangeKey} options={RANGES} />
        </div>
        {rangeKey === 'custom' && (
          <div className="flex min-w-0 flex-wrap gap-2">
            <Field label="Başlangıç" htmlFor="d-from" className="w-40">
              <Input id="d-from" type="date" value={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} />
            </Field>
            <Field label="Bitiş" htmlFor="d-to" className="w-40">
              <Input id="d-to" type="date" value={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} />
            </Field>
          </div>
        )}
        <span className="ml-auto text-xs text-fg-3">karşılaştırma: önceki dönem · iptaller hariç</span>
      </div>

      <div className="grid grid-cols-2 gap-3 @4xl:grid-cols-4">
        <StatCard className="glass rounded-card p-4" label="Ciro" value={tl(cur.revenue)} change={change(cur.revenue, prev.revenue)} hint={`${cur.orders} sipariş · ${cur.units} adet`} />
        <StatCard
          className="glass rounded-card p-4"
          label="Net kâr"
          value={tl(cur.netProfit)}
          tone={cur.netProfit < 0 ? 'danger' : 'default'}
          change={change(cur.netProfit, prev.netProfit)}
          hint="komisyon, maliyet ve kargo sonrası"
        />
        <StatCard
          className="glass rounded-card p-4"
          label="Ortalama marj"
          value={formatPercent(cur.margin)}
          change={cur.margin !== null && prev.margin !== null ? change(cur.margin, prev.margin, true) : undefined}
          hint="net kâr / ciro"
        />
        <StatCard className="glass rounded-card p-4" label="Baskı saati" value={cur.hours > 0 ? formatHours(cur.hours) : '0 dk'} change={change(cur.hours, prev.hours)} hint="siparişlerdeki toplam" />
      </div>

      <div className="grid min-w-0 gap-4 @4xl:grid-cols-3">
        <Card title="Aylık ciro ve net kâr" icon={<BarChart3 />} className="@4xl:col-span-2">
          <MonthlyChart data={data.months} />
        </Card>
        <Card title="Kanal dağılımı" icon={<Target />}>
          <ChannelDonut data={data.shares} colorOf={colorOf} />
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
        <Card title="En çok satan 5 ürün" icon={<BarChart3 />}>
          <BarList rows={data.top.map((t) => ({ key: t.productId, label: t.name, value: t.units, hint: `ciro ${tl(t.revenue)}` }))} format={(v) => `${v} adet`} />
        </Card>
        <Card title="Saat başı kârı en yüksek 5 ürün" icon={<Gauge />}>
          <BarList
            rows={topPerHour.map((p) => ({ key: p.product.id, label: p.product.name, value: p.ev.sale.metrics.profitPerHour ?? 0, hint: `satış ${tl(p.product.salePrice)} · marj ${formatPercent(p.ev.sale.metrics.margin, 0)}` }))}
            format={(v) => `${tl(v)}/sa`}
          />
        </Card>
        <Card title="Filament tüketimi" icon={<Disc3 />}>
          <BarList rows={data.usage} format={formatGram} />
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 @4xl:grid-cols-3">
        <Card
          title="Bekleyen siparişler"
          icon={<ClipboardList />}
          action={
            <Link to="/siparisler" className="flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
              tümü <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {pending.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-fg-3">Bekleyen sipariş yok.</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={async () => {
                  const o = await createOrder()
                  navigate(`/siparisler/${o.id}`)
                }}
              >
                <Plus /> Yeni sipariş
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pending.slice(0, 6).map(({ order, totals }) => (
                <li key={order.id}>
                  <Link to={`/siparisler/${order.id}`} className="flex min-h-11 min-w-0 items-center gap-2 rounded-ctl px-2 py-1.5 hover:bg-surface">
                    <Badge tone={STATUS_TONE[order.status]} size="xs">
                      {STATUS_LABEL[order.status]}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{order.customer || order.number}</span>
                    <DueBadge order={order} />
                    <span className="tnum shrink-0 text-[13px] font-medium">{tl(totals.revenue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Kapasite" icon={<Gauge />}>
          {printers === 0 ? (
            <p className="text-sm text-fg-3">
              Yazıcı yok. <Link to="/yazicilar" className="text-brand-2 hover:underline">Yazıcı ekle</Link>
            </p>
          ) : (
            <>
              <div className="tnum flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold">{formatPercent(capacity > 0 ? (pendingH / capacity) * 100 : 0, 0)}</span>
                <span className="text-xs text-fg-3">
                  {formatNumber(pendingH, 1)} / {formatNumber(capacity)} sa
                </span>
              </div>
              <ProgressBar className="mt-2 h-2.5" value={capacity > 0 ? pendingH / capacity : 0} label="Aylık kapasite doluluğu" />
              <p className="mt-2 text-xs text-fg-3">
                Bekleyen (Yeni + Baskıda) iş {daysOfWork === null ? '—' : `≈ ${formatNumber(daysOfWork, 1)} günlük`} · {printers} yazıcı × {hoursPerDay} sa/gün × 30 gün
              </p>
            </>
          )}
        </Card>

        <Card title="Başa baş" icon={<Target />}>
          {investment <= 0 ? (
            <p className="text-sm text-fg-3">
              Yazıcı fiyatı girilmemiş. <Link to="/yazicilar" className="text-brand-2 hover:underline">Yazıcılar</Link>
            </p>
          ) : (
            <>
              <p className="text-sm text-fg">
                {remainingSales === 0 ? (
                  <b className="text-success">Yazıcı yatırımı çıktı 🎉</b>
                ) : remainingSales === null ? (
                  'Ortalama kâr 0 veya negatif — başa baş hesaplanamıyor'
                ) : (
                  <>
                    Yazıcı yatırımını çıkarmak için ortalama <b className="text-lg">{formatNumber(remainingSales)}</b> satış daha gerekiyor
                  </>
                )}
              </p>
              <ProgressBar className="mt-3" value={Math.min(1, Math.max(0, life.netProfit / investment))} label="Yatırımın geri dönen kısmı" />
              <p className="tnum mt-2 text-xs text-fg-3">
                {tl(Math.max(0, life.netProfit))} / {tl(investment)} · satış başı ort. net kâr {tl(avgProfit)}
                {life.units === 0 && ' (henüz satış yok — ürün ortalamasından)'}
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <Card title="Düşük stok" icon={<Disc3 />} action={<Link to="/filamentler" className="flex items-center gap-1 text-xs text-fg-3 hover:text-fg">stok <ArrowRight className="size-3.5" /></Link>}>
          {lowStock.length === 0 ? (
            <p className="text-sm text-fg-3">{spools.length ? 'Tüm makaralar eşiğin üstünde.' : 'Henüz makara eklenmedi.'}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lowStock.slice(0, 6).map((s) => (
                <li key={s.id} className="flex min-w-0 items-center gap-2 text-[13px]">
                  <ColorSwatch color={s.color} size={22} className="text-fg-3" />
                  <span className="min-w-0 flex-1 truncate">{s.colorName}</span>
                  <Badge tone="danger" size="xs">
                    {formatGram(s.remainingGrams)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Fiyatı eskimiş ürünler" icon={<TriangleAlert />}>
          {stale === 0 ? (
            <p className="text-sm text-fg-3">Tüm satış fiyatları güncel maliyetle uyumlu.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <b className="text-2xl text-warning">{stale}</b> ürünün fiyatı güncel hesaplamadan %5’ten fazla farklı
              </p>
              <Button size="sm" onClick={() => navigate('/urunler')}>
                İncele <ArrowRight />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
