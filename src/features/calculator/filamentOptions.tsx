import { ColorSwatch, type SelectOption } from '@/components/ui'
import { formatGram, formatTL } from '@/lib/format'
import { gramPrice, weightedAverageGramPrice } from '@/lib/pricing'
import { avgFilamentId, resolveFilament, type Catalog } from './draft'

/** Filament seçim listesi: makaralar, stok ortalamaları, türler */
export function filamentOptions(catalog: Catalog): SelectOption[] {
    const spools = catalog.spools.map((sp) => {
      const r = resolveFilament(sp.id, catalog)!
      return {
        value: sp.id,
        label: r.name,
        group: 'Makaralarım',
        icon: <ColorSwatch color={sp.color} size={20} />,
        description: `${formatTL(gramPrice(sp.spoolPrice, sp.spoolGrams) * 1000, { compactDecimals: true })}/kg · ${formatGram(sp.remainingGrams)} kaldı`,
      }
    })
    const types = catalog.filamentTypes.map((t) => ({
      value: t.id,
      label: t.name,
      group: spools.length ? 'Filament türleri' : undefined,
      icon: <ColorSwatch color={t.color} size={20} />,
      description: `${formatTL(gramPrice(t.spoolPrice, t.spoolGrams) * 1000, { compactDecimals: true })}/kg${t.estimated ? ' · tahmini' : ''}`,
    }))
    // Aynı türden birden fazla makara varsa ağırlıklı ortalama gram fiyatı seçilebilir
    const averages = catalog.filamentTypes.flatMap((t) => {
      const own = catalog.spools.filter((sp) => sp.filamentTypeId === t.id)
      const avg = weightedAverageGramPrice(own)
      if (own.length < 2 || avg === null) return []
      return [
        {
          value: avgFilamentId(t.id),
          label: `${t.name} · stok ortalaması`,
          group: 'Stok ortalaması',
          icon: <ColorSwatch color={t.color} size={20} />,
          description: `${own.length} makara · ${formatTL(avg * 1000, { compactDecimals: true })}/kg (ağırlıklı)`,
        },
      ]
    })
    return [...spools, ...averages, ...types]
}
