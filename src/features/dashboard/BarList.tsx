/** Doğrulanmış kategorik palet (koyu/açık temada ayrı tonlar, index.css) — sabit sıra */
export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']

/** Yatay çubuk listesi (en çok satan, saat başı kâr, filament tüketimi) */
export function BarList({ rows, format }: { rows: { key: string; label: string; value: number; hint?: string; swatch?: string }[]; format: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 0)
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-fg-3">Henüz veri yok.</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li key={r.key} className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="tnum w-4 shrink-0 text-xs text-fg-3">{i + 1}</span>
            {r.swatch && <span className="size-3 shrink-0 rounded-full border border-line-strong" style={{ background: r.swatch }} />}
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="tnum shrink-0 font-medium">{format(r.value)}</span>
          </div>
          <div className="mt-1 ml-6 h-1.5 overflow-hidden rounded-full bg-surface-strong">
            <div className="brand-gradient h-full rounded-full" style={{ width: `${max > 0 ? Math.max(3, (r.value / max) * 100) : 0}%` }} />
          </div>
          {r.hint && <div className="mt-0.5 ml-6 truncate text-[11px] text-fg-3">{r.hint}</div>}
        </li>
      ))}
    </ul>
  )
}
