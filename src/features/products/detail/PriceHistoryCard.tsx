import { useLiveQuery } from 'dexie-react-hooks'
import { History } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Section } from '@/components/ui'
import { listPriceHistory } from '@/db'
import { formatTL } from '@/lib/format'

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

const REASON = { save: 'Kaydedildi', apply: 'Yeni fiyat uygulandı', 'sale-change': 'Satış fiyatı değişti' } as const

interface Point {
  at: number
  salePrice: number
  totalCost: number
  reason: keyof typeof REASON
}

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="solid-surface tnum rounded-lg px-3 py-2 text-xs">
      <div className="text-fg-3">{timeFmt.format(p.at)}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[var(--series-1)]" /> Satış <b className="text-fg">{formatTL(p.salePrice)}</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[var(--series-2)]" /> Maliyet <span className="text-fg">{formatTL(p.totalCost)}</span>
      </div>
      <div className="mt-1 text-fg-3">{REASON[p.reason]}</div>
    </div>
  )
}

/** Fiyat geçmişi: satış fiyatı ve maliyetin zaman içindeki değişimi */
export function PriceHistoryCard({ productId }: { productId: string }) {
  const history = useLiveQuery(() => listPriceHistory(productId), [productId], [])
  const data: Point[] = history.map((h) => ({ at: h.at, salePrice: h.salePrice ?? h.priceA, totalCost: h.totalCost, reason: h.reason ?? 'save' }))
  return (
    <Section title="Fiyat geçmişi" description={`${data.length} kayıt`} icon={<History className="size-4" />}>
      {data.length < 2 ? (
        <p className="text-sm text-fg-3">Grafik için en az iki fiyat kaydı gerekiyor. Satış fiyatını değiştirdikçe veya ürünü yeniden kaydettikçe burada görünür.</p>
      ) : (
        <>
          <div className="mb-2 flex gap-4 text-xs text-fg-2">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-[var(--series-1)]" /> Satış fiyatı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-[var(--series-2)]" /> Maliyet
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="at"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(v: number) => dateFmt.format(v)}
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  width={52}
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatTL(v, { compactDecimals: true }).replace(',00', '')}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<HistoryTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                <Line type="stepAfter" dataKey="salePrice" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-elevated)' }} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="totalCost" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-elevated)' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Section>
  )
}
