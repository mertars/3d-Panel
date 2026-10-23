import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge, Button, EmptyState, GlassCard, Menu, Segmented, Skeleton } from '@/components/ui'
import { deleteQuote, listQuotes, restoreQuote, type QuoteStatus } from '@/db'
import { quoteTotal, STATUS_LABEL, STATUS_TONE } from '@/features/quotes/actions'
import { formatDate, formatTL } from '@/lib/format'
import { useNewQuote } from '@/features/quotes/useNewQuote'
import { toast } from '@/store/toast'

type Filter = 'all' | QuoteStatus

export default function QuotesPage() {
  const quotes = useLiveQuery(listQuotes, [])
  const [filter, setFilter] = useState<Filter>('all')
  const newQuote = useNewQuote()

  if (!quotes) return <Skeleton className="h-64 rounded-card" />

  if (quotes.length === 0) {
    return (
      <GlassCard className="mx-auto max-w-3xl" padded={false}>
        <EmptyState
          icon={<FileText />}
          title="Henüz teklif yok"
          description="Özel siparişler için müşteriye şık bir teklif kartı hazırla: PNG olarak indir, WhatsApp metnini kopyala veya yazdır. Maliyet ve kâr asla görünmez."
          action={
            <Button variant="primary" onClick={() => void newQuote()}>
              <Plus />
              Yeni teklif
            </Button>
          }
        />
      </GlassCard>
    )
  }

  const visible = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)
  const count = (s: QuoteStatus) => quotes.filter((q) => q.status === s).length

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="hide-scrollbar max-w-full min-w-0 overflow-x-auto">
          <Segmented<Filter>
            aria-label="Durum filtresi"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Tümü ${quotes.length}` },
              ...(['draft', 'sent', 'accepted', 'rejected'] as const).map((s) => ({ value: s, label: `${STATUS_LABEL[s]} ${count(s)}` })),
            ]}
          />
        </div>
        <Button variant="primary" onClick={() => void newQuote()}>
          <Plus />
          Yeni teklif
        </Button>
      </div>

      {visible.length === 0 ? (
        <GlassCard padded={false}>
          <EmptyState icon={<FileText />} title="Bu durumda teklif yok" />
        </GlassCard>
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((q) => (
            <li key={q.id} className="glass glass-hover relative flex min-w-0 items-start gap-3 p-4">
              <Link to={`/teklifler/${q.id}`} className="absolute inset-0 z-[1] rounded-card" aria-label={`${q.number} teklifini aç`} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="tnum text-xs text-fg-3">{q.number}</span>
                  <Badge tone={STATUS_TONE[q.status]} size="xs">
                    {STATUS_LABEL[q.status]}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-[15px] font-semibold">{q.customer || 'Müşteri adı yok'}</div>
                <div className="mt-0.5 truncate text-xs text-fg-3">
                  {q.items.length} kalem · {formatDate(q.createdAt)} · geçerli {formatDate(q.validUntil)}
                </div>
              </div>
              <div className="tnum shrink-0 pt-4 text-lg font-bold">{formatTL(quoteTotal(q), { compactDecimals: true })}</div>
              <div className="relative z-[2] -mt-1 -mr-1">
                <Menu
                  label={`${q.number} eylemleri`}
                  items={[
                    {
                      label: 'Sil',
                      icon: Trash2,
                      danger: true,
                      onSelect: async () => {
                        const removed = await deleteQuote(q.id)
                        if (removed) toast(`${q.number} silindi`, { action: { label: 'Geri al', onClick: () => void restoreQuote(removed) } })
                      },
                    },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
