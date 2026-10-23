import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPercent, formatTL } from '@/lib/format'
import type { MonthPoint, Share } from './analytics'
import { SERIES } from './BarList'


const tl = (v: number) => formatTL(v, { compactDecimals: true })
const axisTl = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}b` : String(Math.round(v)))

function MonthTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="solid-surface tnum rounded-lg px-3 py-2 text-xs">
      <div className="text-fg-3">{p.label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: SERIES[0] }} /> Ciro <b className="text-fg">{tl(p.revenue)}</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: SERIES[1] }} /> Net kâr <b className="text-fg">{tl(p.netProfit)}</b>
      </div>
    </div>
  )
}

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  return (
    <>
      <div className="mb-2 flex gap-4 text-xs text-fg-2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES[0] }} /> Ciro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES[1] }} /> Net kâr
        </span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={12} />
            <YAxis width={44} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={axisTl} />
            <Tooltip content={<MonthTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
            <Line type="monotone" dataKey="revenue" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3.5, strokeWidth: 2, stroke: 'var(--bg-elevated)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="netProfit" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 3.5, strokeWidth: 2, stroke: 'var(--bg-elevated)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

/** Kanal dağılımı: halka + her zaman görünen değerli lejant (renk tek başına anlam taşımaz) */
export function ChannelDonut({ data, colorOf }: { data: Share[]; colorOf: (key: string) => string }) {
  const total = data.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return <p className="py-10 text-center text-sm text-fg-3">Bu dönemde satış yok.</p>
  return (
    <div className="flex min-w-0 flex-col items-center gap-4">
      <div className="size-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={44} outerRadius={68} stroke="var(--bg-elevated)" strokeWidth={2} isAnimationActive={false} startAngle={90} endAngle={-270}>
              {data.map((s) => (
                <Cell key={s.key} fill={colorOf(s.key)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="solid-surface tnum rounded-lg px-3 py-2 text-xs">
                    {(payload[0].payload as Share).label}: <b>{tl((payload[0].payload as Share).value)}</b>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full min-w-0 flex-1 flex-col gap-1">
        {data.map((s) => (
          <li key={s.key} className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colorOf(s.key) }} />
            <span className="min-w-0 flex-1 truncate text-fg-2">{s.label}</span>
            <span className="tnum shrink-0">{tl(s.value)}</span>
            <span className="tnum w-10 shrink-0 text-right text-xs text-fg-3">{formatPercent((s.value / total) * 100, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
