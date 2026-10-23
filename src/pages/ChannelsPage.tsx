import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Store, Trash2, X } from 'lucide-react'
import { Badge, BlurInput, Button, Field, GlassCard, Menu, NumberInput, Select, Skeleton, Switch } from '@/components/ui'
import { addChannel, deleteChannel, listChannels, restoreChannel, updateChannel, type Channel, type ChannelPercent, type ChannelTier } from '@/db'
import { channelFeeInput } from '@/features/channels/fees'
import { formatDate, formatPercent, formatTL } from '@/lib/format'
import { channelListPrice, effectiveChannelRate } from '@/lib/pricing'
import { useSettings, useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toast'

const today = () => new Date().toISOString().slice(0, 10)
const EXAMPLE_TARGET = 300

/** İsim + yüzde satırları (ek yüzdeler ve kademeler için) */
function PercentRows<T extends ChannelPercent | ChannelTier>({
  rows,
  nameKey,
  onChange,
  addLabel,
  namePlaceholder,
}: {
  rows: T[]
  nameKey: 'name' | 'label'
  onChange: (rows: T[]) => void
  addLabel: string
  namePlaceholder: string
}) {
  const update = (i: number, patch: Partial<T>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_110px_44px] gap-2">
          <BlurInput
            aria-label={`${addLabel} ${i + 1} adı`}
            value={(r as unknown as Record<string, string>)[nameKey]}
            onCommit={(v) => update(i, { [nameKey]: v } as Partial<T>)}
            placeholder={namePlaceholder}
          />
          <NumberInput aria-label={`${addLabel} ${i + 1} oranı`} value={r.percent} onChange={(v) => update(i, { percent: v ?? 0 } as Partial<T>)} unit="%" step={0.5} max={99} />
          <Button variant="ghost" size="icon" className="size-11" aria-label={`${addLabel} ${i + 1} sil`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" className="self-start" onClick={() => onChange([...rows, { [nameKey]: '', percent: 0 } as unknown as T])}>
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}

function ChannelCard({ c }: { c: Channel }) {
  const settings = useSettings()
  const set = (patch: Partial<Channel>) => void updateChannel(c.id, { ...patch, estimated: false })
  const fee = channelFeeInput(c, settings)
  const example = channelListPrice(EXAMPLE_TARGET, fee, settings.rounding)
  const activeTier = c.tiers.find((t) => t.percent === c.commissionPercent)

  async function remove() {
    const removed = await deleteChannel(c.id)
    if (removed) toast(`“${c.name}” silindi`, { action: { label: 'Geri al', onClick: () => void restoreChannel(removed) } })
  }

  return (
    <article className="glass min-w-0 p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <BlurInput aria-label="Kanal adı" value={c.name} onCommit={(name) => name.trim() && set({ name: name.trim() })} className="h-10 font-semibold" />
        </div>
        <Switch checked={c.enabled} onChange={(enabled) => void updateChannel(c.id, { enabled })} aria-label={`${c.name} etkin`} />
        <Menu label={`${c.name} eylemleri`} items={[{ label: 'Kanalı sil', icon: Trash2, danger: true, onSelect: () => void remove() }]} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-3">
        {c.estimated && !c.lastVerified && (
          <Badge tone="warning" size="xs">
            tahmini
          </Badge>
        )}
        {!c.enabled && <Badge size="xs">kapalı — hesaplarda görünmez</Badge>}
        <span className="tnum">efektif oran {formatPercent(effectiveChannelRate(fee) * 100, 2)}</span>
        {example.valid && (
          <span className="tnum">
            · örnek: {formatTL(EXAMPLE_TARGET, { compactDecimals: true })} eline geçsin → liste {formatTL(example.rounded, { compactDecimals: true })}
          </span>
        )}
      </div>

      <div className="@container mt-4 grid min-w-0 grid-cols-2 gap-3 @2xl:grid-cols-4">
        {c.tiers.length > 0 && (
          <Field label="Kademe" htmlFor={`ch-tier-${c.id}`} className="col-span-2" info="Aylık cironuza göre komisyon kademesi. Seçince komisyon oranı güncellenir.">
            <Select
              id={`ch-tier-${c.id}`}
              value={activeTier ? String(activeTier.percent) : ''}
              onChange={(v) => set({ commissionPercent: Number(v) })}
              placeholder="Özel oran"
              options={c.tiers.map((t) => ({ value: String(t.percent), label: `${t.label || 'Kademe'} · %${String(t.percent).replace('.', ',')}` }))}
            />
          </Field>
        )}
        <Field label="Komisyon" htmlFor={`ch-com-${c.id}`}>
          <NumberInput id={`ch-com-${c.id}`} value={c.commissionPercent} onChange={(v) => set({ commissionPercent: v ?? 0 })} unit="%" step={0.5} max={99} />
        </Field>
        <Field label="Sabit ücret" htmlFor={`ch-fix-${c.id}`}>
          <div className="flex gap-1.5">
            <NumberInput id={`ch-fix-${c.id}`} className="flex-1" value={c.fixedFee} onChange={(v) => set({ fixedFee: v ?? 0 })} unit={c.fixedFeeCurrency === 'USD' ? '$' : '₺'} step={0.1} />
            <Select
              aria-label="Para birimi"
              className="w-[76px]"
              value={c.fixedFeeCurrency}
              onChange={(v) => set({ fixedFeeCurrency: v as Channel['fixedFeeCurrency'] })}
              options={[
                { value: 'TRY', label: '₺' },
                { value: 'USD', label: '$' },
              ]}
            />
          </div>
        </Field>
        <Field label="Satıcı kargo" htmlFor={`ch-ship-${c.id}`} info="Kargoyu sen ödüyorsan sipariş başı tutar; sabit kesintiye eklenir.">
          <NumberInput id={`ch-ship-${c.id}`} value={c.sellerShipping} onChange={(v) => set({ sellerShipping: v ?? 0 })} unit="₺" step={5} />
        </Field>
        <div className="flex min-h-11 items-end">
          <label className="flex w-full items-center justify-between gap-2 pb-2.5">
            <span className="text-[13px] text-fg-2">Komisyona %20 KDV</span>
            <Switch checked={c.vatOnCommission} onChange={(v) => set({ vatOnCommission: v })} />
          </label>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1.5 text-[13px] font-medium text-fg-2">Ek yüzdeler</div>
          <PercentRows rows={c.extraPercents} nameKey="name" onChange={(extraPercents) => set({ extraPercents })} addLabel="Ek yüzde" namePlaceholder="ör. Altyapı bedeli" />
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 text-[13px] font-medium text-fg-2">Komisyon kademeleri</div>
          <PercentRows rows={c.tiers} nameKey="label" onChange={(tiers) => set({ tiers })} addLabel="Kademe" namePlaceholder="ör. 50 bin ₺ üstü ciro" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field label="Not" htmlFor={`ch-note-${c.id}`}>
          <BlurInput id={`ch-note-${c.id}`} value={c.note} onCommit={(note) => void updateChannel(c.id, { note })} placeholder="ör. Kategori: ev & yaşam" />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-3">{c.lastVerified ? `Son doğrulama: ${formatDate(c.lastVerified)}` : 'Oranları satıcı panelinden doğrula'}</span>
          <Button size="sm" variant="ghost" onClick={() => set({ lastVerified: today() })}>
            Bugün doğruladım
          </Button>
        </div>
      </div>
    </article>
  )
}

export default function ChannelsPage() {
  const channels = useLiveQuery(listChannels, [])
  const settings = useSettings()
  const update = useSettingsStore((s) => s.update)

  if (!channels) return <Skeleton className="h-80 rounded-card" />

  return (
    <div className="mx-auto flex max-w-5xl min-w-0 flex-col gap-4">
      <GlassCard className="flex min-w-0 flex-wrap items-end gap-4">
        <div className="min-w-0 flex-[1_1_280px]">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Store className="size-4 text-brand-2" /> Satış kanalları
          </h2>
          <p className="mt-1 text-sm text-fg-2">
            Liste fiyatı = (hedef + sabit) / (1 − efektif oran). Komisyona KDV eklenen kanallarda oran ve sabit ücret ×1,20. Oranlar kategoriye ve
            zamana göre değişir — satıcı panelinden doğrula.
          </p>
        </div>
        <Field label="USD kuru (Etsy vb.)" htmlFor="ch-usd" className="w-44" estimated={settings.usdRate === 45} info="Otomatik güncellenmez; güncel kuru elle gir.">
          <NumberInput id="ch-usd" value={settings.usdRate} onChange={(v) => void update({ usdRate: v ?? 0 })} unit="₺/$" step={0.5} />
        </Field>
        <Button
          variant="primary"
          onClick={async () => {
            await addChannel('Yeni kanal')
            toast('Kanal eklendi — adını ve oranlarını düzenle', { tone: 'success' })
          }}
        >
          <Plus />
          Kanal ekle
        </Button>
      </GlassCard>
      {channels.map((c) => (
        <ChannelCard key={c.id} c={c} />
      ))}
    </div>
  )
}
