import { Scale, ShieldCheck } from 'lucide-react'
import { BlurInput, Field, NumberInput, Section, Select } from '@/components/ui'
import { LICENSE_OPTIONS, updateProduct, type ModelLicense, type Product } from '@/db'
import { cn } from '@/lib/cn'
import { formatPercent, formatTL } from '@/lib/format'
import { competitorDiffPercent } from '@/lib/pricing'

/** Maliyet · bizim fiyat · rakip fiyatı konumunu gösteren küçük çubuk */
export function CompetitorBar({ cost, ours, competitor }: { cost: number; ours: number; competitor: number }) {
  const max = Math.max(cost, ours, competitor) * 1.12 || 1
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`
  const diff = competitorDiffPercent(ours, competitor)
  const markers = [
    { label: 'Maliyet', value: cost, cls: 'bg-fg-3' },
    { label: 'Bizim', value: ours, cls: 'brand-gradient' },
    { label: 'Rakip', value: competitor, cls: 'bg-info' },
  ]
  return (
    <div className="mt-4">
      <div className="relative h-2.5 rounded-full bg-surface-strong" role="img" aria-label={`Maliyet ${formatTL(cost)}, bizim fiyat ${formatTL(ours)}, rakip ${formatTL(competitor)}`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-success/25" style={{ width: pos(cost) }} />
        {markers.map((m) => (
          <span key={m.label} className={cn('absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-elevated', m.cls)} style={{ left: pos(m.value) }} />
        ))}
      </div>
      <div className="tnum mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {markers.map((m) => (
          <span key={m.label} className="flex items-center gap-1.5 text-fg-2">
            <span className={cn('size-2 rounded-full', m.cls)} />
            {m.label} {formatTL(m.value, { compactDecimals: true })}
          </span>
        ))}
      </div>
      {diff !== null && (
        <p className={cn('mt-2 text-sm font-medium', diff > 0 ? 'text-warning' : 'text-success')}>
          Rakipten {formatPercent(Math.abs(diff))} {diff > 0 ? 'pahalı' : diff < 0 ? 'ucuz' : ''}
          {diff === 0 && 'aynı fiyat'}
        </p>
      )}
    </div>
  )
}

export function LicenseCompetitorCard({ product, unitCost }: { product: Product; unitCost: number }) {
  const lic = LICENSE_OPTIONS.find((l) => l.value === product.license)
  return (
    <Section title="Lisans & rakip" icon={<Scale className="size-4" />}>
      <Field
        label="Model lisansı"
        htmlFor="pd-license"
        info="MakerWorld’den basılan modellerin çoğu ticari satışa uygun değildir. Satmadan önce model sayfasındaki lisansı kontrol et."
      >
        <Select
          id="pd-license"
          value={product.license}
          onChange={(v) => void updateProduct(product.id, { license: v as ModelLicense })}
          options={LICENSE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
        />
      </Field>
      <p className={cn('mt-2 flex items-center gap-1.5 text-xs', lic?.ok ? 'text-success' : 'text-warning')}>
        <ShieldCheck className="size-3.5" />
        {lic?.ok ? 'Satışa uygun' : 'Satmadan önce lisansı doğrula — kartta uyarı gösterilir'}
      </p>

      <div className="mt-5 grid gap-4 @md:grid-cols-2">
        <Field label="Rakip fiyatı" htmlFor="pd-comp" info="Ör. Trendyol’daki benzer bir ürünün fiyatı.">
          <NumberInput
            id="pd-comp"
            value={product.competitorPrice}
            onChange={(v) => void updateProduct(product.id, { competitorPrice: v })}
            unit="₺"
            step={10}
            placeholder="ör. 349"
          />
        </Field>
        <Field label="Rakip notu" htmlFor="pd-comp-note">
          <BlurInput
            id="pd-comp-note"
            value={product.competitorNote}
            onCommit={(v) => void updateProduct(product.id, { competitorNote: v })}
            placeholder="ör. Trendyol, benzer boy"
          />
        </Field>
      </div>
      {product.competitorPrice ? <CompetitorBar cost={unitCost} ours={product.salePrice} competitor={product.competitorPrice} /> : null}
    </Section>
  )
}
