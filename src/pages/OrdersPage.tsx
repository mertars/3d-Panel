import { ClipboardList, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLayout } from '@/app/AppShell'
import { Badge, Button, EmptyState, GlassCard, Input, Segmented, Skeleton, StatCard, Switch } from '@/components/ui'
import { createOrder, type OrderStatus } from '@/db'
import { BOARD_STATUSES, changeStatus, STATUS_LABEL, useOrdersData } from '@/features/orders/actions'
import { FailuresCard, WasteBanner } from '@/features/orders/Failures'
import { OrderCard } from '@/features/orders/OrderCard'
import { cn } from '@/lib/cn'
import { formatHours, formatTL } from '@/lib/format'

const norm = (s: string) => s.toLocaleLowerCase('tr-TR')

export default function OrdersPage() {
  const { orders, failures, channels, catalog, waste, loaded } = useOrdersData()
  const { contentWidth } = useLayout()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<OrderStatus>('new')
  const [showCancelled, setShowCancelled] = useState(false)
  const [dragOver, setDragOver] = useState<OrderStatus | null>(null)

  const visible = useMemo(() => {
    const q = norm(query.trim())
    return q ? orders.filter(({ order: o }) => norm(`${o.number} ${o.customer} ${o.items.map((i) => i.name).join(' ')}`).includes(q)) : orders
  }, [orders, query])

  const newOrder = async () => {
    const o = await createOrder()
    navigate(`/siparisler/${o.id}`)
  }

  if (!loaded) return <Skeleton className="h-96 rounded-card" />

  const open = orders.filter(({ order }) => order.status !== 'delivered' && order.status !== 'cancelled')
  const openRevenue = open.reduce((s, x) => s + x.totals.revenue, 0)
  const openHours = open.filter(({ order }) => order.status === 'new' || order.status === 'printing').reduce((s, x) => s + x.totals.hours, 0)
  const unpaid = orders.filter(({ order }) => !order.paid && order.status !== 'cancelled').length
  const byStatus = (s: OrderStatus) => visible.filter(({ order }) => order.status === s)
  const board = contentWidth >= 900

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <WasteBanner real={waste.real} count={waste.count} />

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_220px]">
          <Input leading={<Search />} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Müşteri, sipariş no veya ürün ara" aria-label="Sipariş ara" data-page-search />
        </div>
        <Button variant="primary" onClick={() => void newOrder()}>
          <Plus />
          Yeni sipariş
        </Button>
      </div>

      {orders.length === 0 ? (
        <GlassCard padded={false}>
          <EmptyState
            icon={<ClipboardList />}
            title="Henüz sipariş yok"
            description="Siparişi kaydet; Baskıda’ya geçince filament stoktan düşer ve yazıcı saatine eklenir. Kabul edilen teklifler de tek tıkla siparişe dönüşür."
            action={
              <Button variant="primary" onClick={() => void newOrder()}>
                <Plus />
                İlk siparişi ekle
              </Button>
            }
          />
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label="Açık sipariş" value={open.length} />
            <StatCard label="Açık sipariş cirosu" value={formatTL(openRevenue, { compactDecimals: true })} />
            <StatCard label="Bekleyen baskı" value={openHours > 0 ? formatHours(openHours) : '—'} hint="Yeni + Baskıda" />
            <StatCard label="Ödeme bekleyen" value={unpaid} tone={unpaid ? 'danger' : 'default'} />
          </div>

          {board ? (
            <div className="-mx-1 overflow-x-auto px-1 pb-2" role="region" aria-label="Sipariş panosu (sürükleyip bırakarak durumu değiştir)" tabIndex={0}>
              <div className="grid min-w-[1000px] grid-cols-5 gap-3">
                {BOARD_STATUSES.map((s) => {
                  const list = byStatus(s)
                  return (
                    <section
                      key={s}
                      aria-label={STATUS_LABEL[s]}
                      onDragOver={(e) => {
                        if (!e.dataTransfer.types.includes('text/order-id')) return
                        e.preventDefault()
                        setDragOver(s)
                      }}
                      onDragLeave={() => setDragOver((d) => (d === s ? null : d))}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOver(null)
                        const id = e.dataTransfer.getData('text/order-id')
                        const o = orders.find((x) => x.order.id === id)?.order
                        if (o && o.status !== s) void changeStatus(o, s)
                      }}
                      className={cn(
                        'flex min-h-[320px] min-w-0 flex-col gap-2 rounded-[18px] border border-dashed p-2 transition-colors',
                        dragOver === s ? 'border-brand-2/60 bg-brand-2/8' : 'border-transparent bg-inset',
                      )}
                    >
                      <h2 className="flex items-center justify-between px-1.5 pt-1 text-[13px] font-semibold">
                        {STATUS_LABEL[s]}
                        <Badge size="xs">{list.length}</Badge>
                      </h2>
                      {list.map(({ order, totals }) => (
                        <OrderCard key={order.id} order={order} totals={totals} channels={channels} draggable />
                      ))}
                      {list.length === 0 && <p className="px-1.5 py-6 text-center text-xs text-fg-3">Buraya sürükle</p>}
                    </section>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="hide-scrollbar -mx-4 overflow-x-auto px-4">
                <Segmented<OrderStatus>
                  aria-label="Sipariş durumu"
                  size="sm"
                  value={tab}
                  onChange={setTab}
                  options={[...BOARD_STATUSES, 'cancelled' as const].map((s) => ({ value: s, label: `${STATUS_LABEL[s]} ${byStatus(s).length}` }))}
                />
              </div>
              {byStatus(tab).length === 0 ? (
                <p className="py-8 text-center text-sm text-fg-3">Bu durumda sipariş yok.</p>
              ) : (
                byStatus(tab).map(({ order, totals }) => <OrderCard key={order.id} order={order} totals={totals} channels={channels} />)
              )}
            </div>
          )}

          {board && (
            <div className="flex flex-col gap-2">
              <label className="flex min-h-11 items-center gap-2.5 self-end text-sm text-fg-2">
                İptal edilenleri göster ({byStatus('cancelled').length})
                <Switch checked={showCancelled} onChange={setShowCancelled} aria-label="İptal edilen siparişleri göster" />
              </label>
              {showCancelled && (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {byStatus('cancelled').map(({ order, totals }) => (
                    <OrderCard key={order.id} order={order} totals={totals} channels={channels} showStatus />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <FailuresCard failures={failures} catalog={catalog} waste={waste} />
    </div>
  )
}
