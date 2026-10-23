import { useLiveQuery } from 'dexie-react-hooks'
import { Disc3, Pencil, Plus, Printer as PrinterIcon, Star, Store, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, ColorSwatch, ConfirmDialog, EmptyState, Field, Input, NumberInput, Section, Select, Switch } from '@/components/ui'
import {
  addFilamentType,
  deleteFilamentType,
  deletePrinter,
  listChannels,
  listFilamentTypes,
  listPrinters,
  restoreFilamentType,
  restorePrinter,
  updateChannel,
  updateFilamentType,
  type Channel,
  type FilamentType,
  type Printer,
} from '@/db'
import { PrinterDialog } from '@/features/printers/PrinterDialog'
import { formatDate, formatTL } from '@/lib/format'
import { gramPrice, printerHourlyDepreciation } from '@/lib/pricing'
import { toast } from '@/store/toast'

/* ───────────── Yazıcılar ───────────── */

export function PrintersSettingsSection() {
  const printers = useLiveQuery(listPrinters, [], [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Printer | null>(null)

  async function remove(p: Printer) {
    const removed = await deletePrinter(p.id)
    if (removed) toast(`“${p.name}” silindi`, { action: { label: 'Geri al', onClick: () => void restorePrinter(removed) } })
  }

  return (
    <Section
      title="Yazıcılar"
      description="Ayrıntılı yönetim Parça 2’de. Şimdilik ekle, düzenle, sil."
      icon={<PrinterIcon className="size-4" />}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus />
          Ekle
        </Button>
      }
    >
      {printers.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<PrinterIcon />}
          title="Henüz yazıcı yok"
          description="Amortisman ve elektrik maliyeti için en az bir yazıcı ekle."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {printers.map((p) => (
            <li key={p.id} className="inset-surface flex min-w-0 items-center gap-3 rounded-[14px] py-2 pr-2 pl-4">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  {p.isDefault && (
                    <Badge tone="brand" size="xs">
                      <Star className="size-2.5" /> varsayılan
                    </Badge>
                  )}
                </div>
                <div className="tnum truncate text-xs text-fg-3">
                  {p.price ? formatTL(p.price, { compactDecimals: true }) : 'fiyat yok'} · {p.watts} W · amortisman{' '}
                  {formatTL(printerHourlyDepreciation(p.price, p.salvageValue, p.lifeHours))}/sa
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${p.name} düzenle`}
                onClick={() => {
                  setEditing(p)
                  setOpen(true)
                }}
              >
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`${p.name} sil`} onClick={() => void remove(p)}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PrinterDialog open={open} onOpenChange={setOpen} printer={editing} />
    </Section>
  )
}

/* ───────────── Filament türleri ───────────── */

function FilamentTypeRow({ t }: { t: FilamentType }) {
  const [confirm, setConfirm] = useState(false)
  // Ad yerel tutulur, odak çıkınca yazılır (canlı sorgu gecikmesi imleci kaydırmasın)
  const [name, setName] = useState(t.name)
  const perKg = gramPrice(t.spoolPrice, t.spoolGrams) * 1000
  return (
    <li className="inset-surface grid min-w-0 grid-cols-[auto_minmax(0,1fr)_44px] items-center gap-x-3 gap-y-2 rounded-[14px] p-2.5 @2xl:grid-cols-[auto_minmax(0,1fr)_130px_110px_44px]">
      <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-ctl hover:bg-surface" title="Rengi değiştir">
        <ColorSwatch color={t.color} size={28} />
        <input
          type="color"
          value={t.color}
          onChange={(e) => void updateFilamentType(t.id, { color: e.target.value })}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`${t.name} rengi`}
        />
      </label>
      <div className="min-w-0">
        <Input
          aria-label="Filament adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== t.name && void updateFilamentType(t.id, { name: name.trim() })}
          className="h-10"
        />
        <div className="tnum mt-1 flex items-center gap-1.5 px-1 text-[11px] text-fg-3">
          {formatTL(perKg, { compactDecimals: true })}/kg · {String(t.density).replace('.', ',')} g/cm³
          {t.estimated && (
            <Badge tone="warning" size="xs">
              tahmini
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label={`${t.name} sil`} onClick={() => setConfirm(true)} className="@2xl:order-last">
        <Trash2 />
      </Button>
      <div className="col-span-3 grid grid-cols-2 gap-2 @2xl:col-span-2">
        <NumberInput aria-label={`${t.name} makara fiyatı`} value={t.spoolPrice} onChange={(v) => void updateFilamentType(t.id, { spoolPrice: v ?? 0 })} unit="₺" step={25} />
        <NumberInput aria-label={`${t.name} makara gramı`} value={t.spoolGrams} onChange={(v) => void updateFilamentType(t.id, { spoolGrams: v ?? 0 })} unit="g" step={50} />
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`“${t.name}” silinsin mi?`}
        description="Bu türü kullanan kayıtlı ürünlerde filament maliyeti 0 görünür. Silindikten sonra kısa süre geri alabilirsin."
        confirmLabel="Sil"
        onConfirm={async () => {
          const removed = await deleteFilamentType(t.id)
          if (removed) toast(`“${t.name}” silindi`, { action: { label: 'Geri al', onClick: () => void restoreFilamentType(removed) } })
        }}
      />
    </li>
  )
}

export function FilamentTypesSettingsSection() {
  const types = useLiveQuery(listFilamentTypes, [], [])
  return (
    <Section
      title="Filament türleri"
      description="Makara fiyatı ve gramı (gram fiyatı = makara fiyatı / makara gramı). Tahmini değerleri kendi aldığın fiyatla güncelle."
      icon={<Disc3 className="size-4" />}
      actions={
        <Button
          size="sm"
          onClick={() =>
            void addFilamentType({ name: 'Yeni filament', material: 'PLA', spoolPrice: 600, spoolGrams: 1000, density: 1.24, color: '#FF3D77' })
          }
        >
          <Plus />
          Ekle
        </Button>
      }
    >
      <ul className="flex flex-col gap-2">
        {types.map((t) => (
          <FilamentTypeRow key={t.id} t={t} />
        ))}
      </ul>
    </Section>
  )
}

/* ───────────── Satış kanalları ───────────── */

const today = () => new Date().toISOString().slice(0, 10)

function ChannelRow({ c }: { c: Channel }) {
  const set = (patch: Partial<Channel>) => void updateChannel(c.id, { ...patch, estimated: false })
  const extra = c.extraPercents.reduce((s, p) => s + p.percent, 0)
  return (
    <li className="inset-surface min-w-0 rounded-[14px] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">{c.name}</span>
            {c.estimated && !c.lastVerified && (
              <Badge tone="warning" size="xs">
                tahmini
              </Badge>
            )}
          </div>
          {c.note && <p className="mt-0.5 text-xs text-fg-3">{c.note}</p>}
        </div>
        <Switch checked={c.enabled} onChange={(enabled) => void updateChannel(c.id, { enabled })} aria-label={`${c.name} etkin`} />
      </div>
      {c.enabled && (
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 @2xl:grid-cols-4">
          {c.tiers.length > 0 && (
            <Field label="Kademe" htmlFor={`ch-tier-${c.id}`} className="col-span-2">
              <Select
                id={`ch-tier-${c.id}`}
                value={String(c.tiers.find((t) => t.percent === c.commissionPercent)?.percent ?? '')}
                onChange={(v) => set({ commissionPercent: Number(v) })}
                placeholder="Özel oran"
                options={c.tiers.map((t) => ({ value: String(t.percent), label: `${t.label} · %${String(t.percent).replace('.', ',')}` }))}
              />
            </Field>
          )}
          <Field label="Komisyon" htmlFor={`ch-com-${c.id}`}>
            <NumberInput id={`ch-com-${c.id}`} value={c.commissionPercent} onChange={(v) => set({ commissionPercent: v ?? 0 })} unit="%" step={0.5} max={99} />
          </Field>
          <Field label={`Sabit ücret${c.fixedFeeCurrency === 'USD' ? ' ($)' : ''}`} htmlFor={`ch-fix-${c.id}`}>
            <NumberInput id={`ch-fix-${c.id}`} value={c.fixedFee} onChange={(v) => set({ fixedFee: v ?? 0 })} unit={c.fixedFeeCurrency === 'USD' ? '$' : '₺'} step={0.1} />
          </Field>
          <Field label="Satıcı kargo" htmlFor={`ch-ship-${c.id}`} info="Kargoyu sen ödüyorsan sipariş başı tutar.">
            <NumberInput id={`ch-ship-${c.id}`} value={c.sellerShipping} onChange={(v) => set({ sellerShipping: v ?? 0 })} unit="₺" step={5} />
          </Field>
          <div className="flex min-h-11 items-end">
            <label className="flex w-full items-center justify-between gap-2 pb-2.5">
              <span className="text-[13px] text-fg-2">Komisyona KDV</span>
              <Switch checked={c.vatOnCommission} onChange={(v) => set({ vatOnCommission: v })} />
            </label>
          </div>
          {extra > 0 && (
            <p className="col-span-2 text-xs text-fg-3 @2xl:col-span-4">
              Ek oranlar: {c.extraPercents.map((p) => `${p.name} %${String(p.percent).replace('.', ',')}`).join(' · ')}
            </p>
          )}
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 @2xl:col-span-4">
            <span className="text-xs text-fg-3">
              {c.lastVerified ? `Son doğrulama: ${formatDate(c.lastVerified)}` : 'Oranları satıcı panelinden doğrula'}
            </span>
            <Button size="sm" variant="ghost" onClick={() => set({ lastVerified: today() })}>
              Bugün doğruladım
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

export function ChannelsSettingsSection() {
  const channels = useLiveQuery(listChannels, [], [])
  return (
    <Section
      title="Satış kanalları"
      description="Kanal fiyatı = (hedef + sabit) / (1 − efektif oran). Yeni kanal ekleme Parça 2’de."
      icon={<Store className="size-4" />}
    >
      <ul className="flex flex-col gap-2">
        {channels.map((c) => (
          <ChannelRow key={c.id} c={c} />
        ))}
      </ul>
    </Section>
  )
}
