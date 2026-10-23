import { ArrowRightLeft, CalendarClock, CircleCheck, CircleDashed } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Badge, Menu } from '@/components/ui'
import { ORDER_STATUSES, type Channel, type Order } from '@/db'
import { cn } from '@/lib/cn'
import { formatHours, formatTL } from '@/lib/format'
import type { OrderTotals } from '@/lib/pricing'
import { changeStatus, STATUS_LABEL, STATUS_TONE } from './actions'

const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const todayIso = () => new Date().toISOString().slice(0, 10)

export function DueBadge({ order }: { order: Order }) {
  if (!order.dueDate || order.status === 'delivered' || order.status === 'cancelled') return null
  const late = order.dueDate < todayIso()
  const today = order.dueDate === todayIso()
  return (
    <Badge tone={late ? 'danger' : today ? 'warning' : 'neutral'} size="xs">
      <CalendarClock className="size-3" />
      {late ? 'gecikti · ' : today ? 'bugün · ' : ''}
      {shortDate.format(new Date(order.dueDate))}
    </Badge>
  )
}

interface OrderCardProps {
  order: Order
  totals: OrderTotals
  channels: Channel[]
  draggable?: boolean
  showStatus?: boolean
}

/** Kanban kartı / mobil liste satırı */
export function OrderCard({ order, totals, channels, draggable, showStatus }: OrderCardProps) {
  const navigate = useNavigate()
  const channel = channels.find((c) => c.id === order.channelId)
  const summary = order.items.map((i) => `${i.quantity}× ${i.name || 'kalem'}`).join(', ')
  return (
    <article
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/order-id', order.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      // Sürüklenebilir kartta tıklama kartın kendisinden; bağlantı katmanı fareyi engellemez (aksi halde sürükleme başlamaz)
      onClick={draggable ? () => navigate(`/siparisler/${order.id}`) : undefined}
      className={cn('glass glass-hover relative flex min-w-0 flex-col gap-2 rounded-[16px] p-3.5', draggable && 'cursor-grab active:cursor-grabbing')}
    >
      <Link
        to={`/siparisler/${order.id}`}
        className={cn('absolute inset-0 z-[1] rounded-[16px]', draggable && 'pointer-events-none')}
        aria-label={`${order.number} siparişini aç`}
        draggable={false}
      />
      <div className="flex min-w-0 items-center gap-2">
        <span className="tnum text-[11px] text-fg-3">{order.number}</span>
        {showStatus && (
          <Badge tone={STATUS_TONE[order.status]} size="xs">
            {STATUS_LABEL[order.status]}
          </Badge>
        )}
        <span className="flex-1" />
        <div className="relative z-[2] -my-2 -mr-2" onClick={(e) => e.stopPropagation()}>
          <Menu
            label={`${order.number} durumunu değiştir`}
            items={ORDER_STATUSES.map((s) => ({
              label: `→ ${s.label}`,
              icon: ArrowRightLeft,
              disabled: s.value === order.status,
              onSelect: () => void changeStatus(order, s.value),
            }))}
          />
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{order.customer || 'Müşteri adı yok'}</div>
        <div className="line-clamp-2 text-xs text-fg-3">{summary || 'Kalem yok'}</div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <DueBadge order={order} />
        {order.paid ? (
          <Badge tone="success" size="xs">
            <CircleCheck className="size-3" /> ödendi
          </Badge>
        ) : (
          <Badge size="xs">
            <CircleDashed className="size-3" /> ödeme bekliyor
          </Badge>
        )}
        {channel && <Badge size="xs">{channel.name}</Badge>}
      </div>
      <div className="tnum flex items-end justify-between gap-2 border-t border-line pt-2 text-xs">
        <span className="text-fg-3">{totals.hours > 0 ? formatHours(totals.hours) : '—'}</span>
        <span className="text-right">
          <span className="block text-sm font-bold text-fg">{formatTL(totals.revenue, { compactDecimals: true })}</span>
          <span className={totals.netProfit < 0 ? 'text-danger' : 'text-success'}>net {formatTL(totals.netProfit, { compactDecimals: true })}</span>
        </span>
      </div>
    </article>
  )
}
