import { ArrowRight, BadgePercent, Boxes, ImagePlus, Plus, Stamp, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { BlurInput, Button, Field, NumberInput, Section, Segmented } from '@/components/ui'
import { useBlobUrl } from '@/hooks/useBlobUrl'
import { formatGram } from '@/lib/format'
import { compressImage } from '@/lib/image'
import type { BulkTier } from '@/lib/pricing'
import { useSettings, useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toast'

export function BulkTiersSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  const tiers = s.bulkTiers
  const setTiers = (next: BulkTier[]) => void update({ bulkTiers: next })
  const change = (i: number, patch: Partial<BulkTier>) => setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  return (
    <Section
      title="Toplu adet indirimleri"
      description="Ürün detayındaki toplu fiyat tablosu ve teklif birim fiyatları bu kademeleri kullanır."
      icon={<BadgePercent className="size-4" />}
    >
      <div className="flex flex-col gap-2">
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
            <NumberInput aria-label={`Kademe ${i + 1} adet`} value={t.quantity} onChange={(v) => change(i, { quantity: Math.max(1, Math.round(v ?? 1)) })} unit="adet ve üstü" min={1} />
            <NumberInput aria-label={`Kademe ${i + 1} indirim`} value={t.discountPercent} onChange={(v) => change(i, { discountPercent: v ?? 0 })} unit="% indirim" step={1} max={90} />
            <Button variant="ghost" size="icon" className="size-11" aria-label={`Kademe ${i + 1} sil`} onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        className="mt-3"
        onClick={() => setTiers([...tiers, { quantity: (tiers[tiers.length - 1]?.quantity ?? 1) * 2, discountPercent: (tiers[tiers.length - 1]?.discountPercent ?? 0) + 5 }])}
      >
        <Plus />
        Kademe ekle
      </Button>
    </Section>
  )
}

export function StockSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  return (
    <Section title="Stok" icon={<Boxes className="size-4" />}>
      <Field label="Düşük stok eşiği" htmlFor="s-low" info="Kalan gramı bu değerin altına (veya eşitine) düşen makaralarda ekranda “düşük stok” rozeti çıkar. Bildirim gönderilmez." hint={`Şu an ${formatGram(s.lowStockGrams)}`}>
        <NumberInput id="s-low" value={s.lowStockGrams} onChange={(v) => void update({ lowStockGrams: v ?? 0 })} unit="g" step={50} />
      </Field>
    </Section>
  )
}

function LogoInput() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  const url = useBlobUrl(s.brandLogo)
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      await update({ brandLogo: await compressImage(file, 150 * 1024, 512) })
    } catch {
      toast('Logo işlenemedi', { tone: 'danger' })
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        aria-label={s.brandLogo ? 'Logoyu değiştir' : 'Logo yükle'}
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line-strong bg-field text-fg-3 hover:border-brand-2/50"
      >
        {url ? <img src={url} alt="Marka logosu" className="size-full object-contain p-1" /> : <ImagePlus className={busy ? 'size-5 animate-pulse' : 'size-5'} />}
      </button>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => ref.current?.click()}>
          {s.brandLogo ? 'Değiştir' : 'Logo yükle'}
        </Button>
        {s.brandLogo && (
          <Button size="sm" variant="ghost" onClick={() => void update({ brandLogo: null })}>
            <Trash2 />
            Kaldır
          </Button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void handle(e.target.files?.[0])} />
    </div>
  )
}

export function BrandSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  return (
    <Section title="Marka & teklif" description="Teklif kartında müşteriye görünen bilgiler." icon={<Stamp className="size-4" />}>
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <Field label="Logo" className="@2xl:col-span-2">
          <LogoInput />
        </Field>
        <Field label="Marka adı" htmlFor="s-brand">
          <BlurInput id="s-brand" value={s.brandName} onCommit={(v) => void update({ brandName: v })} placeholder="ör. Katman Atölye" />
        </Field>
        <Field label="İletişim" htmlFor="s-contact" hint="Instagram, telefon veya web — teklifin altında görünür">
          <BlurInput id="s-contact" value={s.brandContact} onCommit={(v) => void update({ brandContact: v })} placeholder="ör. @katmanatolye · 0555 000 00 00" />
        </Field>
        <Field label="Teklif geçerliliği" htmlFor="s-valid">
          <NumberInput id="s-valid" value={s.quoteValidityDays} onChange={(v) => void update({ quoteValidityDays: Math.max(1, Math.round(v ?? 14)) })} unit="gün" step={1} min={1} />
        </Field>
        <Field label="Varsayılan teslim süresi" htmlFor="s-lead">
          <BlurInput id="s-lead" value={s.defaultLeadTime} onCommit={(v) => void update({ defaultLeadTime: v })} placeholder="ör. 3–5 iş günü" />
        </Field>
      </div>
    </Section>
  )
}

export function CatalogLinksSection() {
  const links = [
    { to: '/yazicilar', label: 'Yazıcılar', hint: 'fiyat, watt, ömür, bakım kaydı' },
    { to: '/filamentler', label: 'Filamentler', hint: 'tür fiyatları ve makara stoğu' },
    { to: '/kanallar', label: 'Kanallar', hint: 'komisyon oranları, kademeler, USD kuru' },
  ]
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-3">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="glass glass-hover flex min-h-16 min-w-0 items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{l.label}</div>
            <div className="truncate text-xs text-fg-3">{l.hint}</div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-fg-3" />
        </Link>
      ))}
    </div>
  )
}

export function OrdersSettingsSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  return (
    <Section title="Siparişler & kapasite" icon={<Boxes className="size-4" />}>
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <Field
          label="Stoktan düşme zamanı"
          htmlFor="s-consume"
          info="Sipariş bu duruma geçince kullanılan filament stoktan düşülür ve yazıcı saat sayacına eklenir. Sipariş Yeni veya İptal’e alınırsa geri alınır."
        >
          <Segmented<'printing' | 'delivered'>
            aria-label="Stoktan düşme zamanı"
            className="w-full"
            value={s.consumeOn}
            onChange={(consumeOn) => void update({ consumeOn })}
            options={[
              { value: 'printing', label: 'Baskıda' },
              { value: 'delivered', label: 'Teslim edildi' },
            ]}
          />
        </Field>
        <Field label="Yazıcı başına günlük kullanılabilir saat" htmlFor="s-hpd" info="Panel’deki kapasite hesabı için: yazıcı sayısı × günlük saat × 30 gün.">
          <NumberInput id="s-hpd" value={s.printerHoursPerDay} onChange={(v) => void update({ printerHoursPerDay: Math.min(24, Math.max(1, v ?? 16)) })} unit="sa/gün" step={1} min={1} max={24} />
        </Field>
      </div>
    </Section>
  )
}
