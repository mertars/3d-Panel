import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/cn'
import { formatPercent, formatTL } from '@/lib/format'
import type { CostSlice } from '@/lib/pricing'

/** Sabit sıra: renk kalemi takip eder, sırasını değil */
const SLICE_COLOR: Record<CostSlice['key'], string> = {
  filament: 'var(--series-1)',
  electricity: 'var(--series-2)',
  depreciation: 'var(--series-3)',
  maintenance: 'var(--series-4)',
  waste: 'var(--series-5)',
  labor: 'var(--series-6)',
  extras: 'var(--series-7)',
  cost: 'var(--series-1)',
}

interface TipProps {
  active?: boolean
  payload?: { payload: CostSlice }[]
  total: number
}

function DonutTooltip({ active, payload, total }: TipProps) {
  if (!active || !payload?.length) return null
  const s = payload[0].payload
  return (
    <div className="solid-surface rounded-lg px-3 py-2 text-xs">
      <div className="text-fg-2">{s.label}</div>
      <div className="tnum mt-0.5 font-semibold text-fg">
        {formatTL(s.value)} · {formatPercent(total > 0 ? (s.value / total) * 100 : 0)}
      </div>
    </div>
  )
}

/** Adet başı maliyet dağılımı: halka + her zaman görünen değerli lejant (tablo görevi görür) */
export function CostDonut({ slices, total }: { slices: CostSlice[]; total: number }) {
  const [hover, setHover] = useState<string | null>(null)
  const data = slices.filter((s) => s.value > 0.0001)
  const empty = data.length === 0

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-[132px] shrink-0">
        {empty ? (
          <div className="size-full rounded-full border-[14px] border-line" aria-hidden />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={46}
                outerRadius={64}
                startAngle={90}
                endAngle={-270}
                stroke="var(--bg-elevated)"
                strokeWidth={2}
                isAnimationActive={false}
                onMouseLeave={() => setHover(null)}
              >
                {data.map((s) => (
                  <Cell
                    key={s.key}
                    fill={SLICE_COLOR[s.key]}
                    opacity={hover && hover !== s.key ? 0.35 : 1}
                    onMouseEnter={() => setHover(s.key)}
                  />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-fg-3">adet başı</span>
          <span className="tnum text-sm font-semibold text-fg">{formatTL(total, { compactDecimals: true })}</span>
        </div>
      </div>

      <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1">
        {slices.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[13px] transition-opacity',
              hover && hover !== s.key && 'opacity-50',
            )}
          >
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: SLICE_COLOR[s.key] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-fg-2">{s.label}</span>
            <span className="tnum shrink-0 text-fg">{formatTL(s.value)}</span>
            <span className="tnum w-12 shrink-0 text-right text-xs text-fg-3">
              {formatPercent(total > 0 ? (s.value / total) * 100 : 0, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
