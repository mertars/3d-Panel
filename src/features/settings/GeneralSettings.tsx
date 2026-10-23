import { Banknote, Coins, Palette, Receipt } from 'lucide-react'
import { Field, NumberInput, Section, Segmented, Select, Switch } from '@/components/ui'
import { DEFAULT_SETTINGS, type AppSettings } from '@/db'
import { formatTL } from '@/lib/format'
import { ROUNDING_OPTIONS, type RoundingMode } from '@/lib/pricing'
import { useSettings, useSettingsStore } from '@/store/settings'
import { useUI, type ThemePref } from '@/store/ui'
import { ExamplePrice } from './ExamplePrice'

const isDefault = <K extends keyof AppSettings>(s: AppSettings, k: K) => s[k] === DEFAULT_SETTINGS[k]

function ToggleRow({ label, description, checked, onChange, id }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0">
        <div className="text-sm text-fg">{label}</div>
        {description && <div className="text-xs text-fg-3">{description}</div>}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} />
    </div>
  )
}

export function PricingSettingsSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  return (
    <Section title="Fiyatlandırma" description="Fiyat A ve Fiyat B’nin nasıl hesaplanacağı." icon={<Coins className="size-4" />}>
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <Field label="Maliyet çarpanı (Fiyat A)" htmlFor="s-mult" info="Fiyat A = toplam maliyet × çarpan. 2,0 → maliyetin iki katı.">
          <NumberInput id="s-mult" value={s.costMultiplier} onChange={(v) => update({ costMultiplier: v ?? 0 })} unit="×" step={0.1} />
        </Field>
        <Field
          label="Saatlik kâr ücreti (Fiyat B)"
          htmlFor="s-hourly"
          info="Fiyat B = maliyet + adet başı baskı saati × bu ücret. Yazıcının bir saatini kaça kiraladığını düşün."
        >
          <NumberInput id="s-hourly" value={s.hourlyProfit} onChange={(v) => update({ hourlyProfit: v ?? 0 })} unit="₺/sa" step={5} />
        </Field>
        <Field
          label="Yuvarlama"
          htmlFor="s-round"
          info="Önerilen fiyatlar her zaman YUKARI yuvarlanır. Kâr hesapları yuvarlanmış fiyat üzerinden yapılır."
        >
          <Select
            id="s-round"
            value={s.rounding}
            onChange={(v) => update({ rounding: v as RoundingMode })}
            options={ROUNDING_OPTIONS.map((o) => ({ value: o.value, label: o.label, description: o.example }))}
          />
        </Field>
        <div className="flex items-end">
          <ToggleRow
            id="s-incb"
            label="Fiyat B’ye maliyeti ekle"
            description={s.includeCostInB ? 'B = maliyet + saat × ücret' : 'B = saat × ücret'}
            checked={s.includeCostInB}
            onChange={(v) => update({ includeCostInB: v })}
          />
        </div>
      </div>
      <ExamplePrice className="mt-5" />
    </Section>
  )
}

export function CostSettingsSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  return (
    <Section title="Maliyet" description="Her üründe kullanılan birim maliyetler." icon={<Receipt className="size-4" />}>
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <Field
          label="Elektrik birim fiyatı"
          htmlFor="s-kwh"
          estimated={isDefault(s, 'kwhPrice')}
          info="Faturandaki birim fiyatı gir. Mesken düşük kademe ~2,6–2,9 TL, yüksek kademe ~3,9–4,3 TL, ticarethane ~4,8 TL civarı. 2026’da birkaç kez zam geldi."
        >
          <NumberInput id="s-kwh" value={s.kwhPrice} onChange={(v) => update({ kwhPrice: v ?? 0 })} unit="₺/kWh" step={0.1} />
        </Field>
        <Field label="Saatlik işçilik ücreti" htmlFor="s-labor" info="Destek söküm, zımpara, montaj gibi el emeğine biçtiğin saatlik değer.">
          <NumberInput id="s-labor" value={s.laborRate} onChange={(v) => update({ laborRate: v ?? 0 })} unit="₺/sa" step={10} />
        </Field>
        <Field
          label="Fire oranı"
          htmlFor="s-waste"
          estimated={isDefault(s, 'wastePercent')}
          info="Başarısız baskı payı. Yalnızca makine + malzeme maliyetine uygulanır. İyi ayarlı Bambu yazıcıda %3–5, yeni başlayanda %15–30."
        >
          <NumberInput id="s-waste" value={s.wastePercent} onChange={(v) => update({ wastePercent: v ?? 0 })} unit="%" step={1} max={95} />
        </Field>
        <Field label="Varsayılan ambalaj" htmlFor="s-pack" info="Yeni ürünlerde ambalaj alanına otomatik yazılır.">
          <NumberInput id="s-pack" value={s.defaultPackaging} onChange={(v) => update({ defaultPackaging: v ?? 0 })} unit="₺" step={1} />
        </Field>
      </div>
    </Section>
  )
}

export function TaxFormatSection() {
  const s = useSettings()
  const update = useSettingsStore((st) => st.update)
  return (
    <Section title="KDV & para formatı" icon={<Banknote className="size-4" />}>
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <ToggleRow
          id="s-vat"
          label="KDV’yi göster"
          description="Önerilen fiyatların KDV dahil hali de gösterilir"
          checked={s.vatEnabled}
          onChange={(v) => update({ vatEnabled: v })}
        />
        <Field label="KDV oranı" htmlFor="s-vatp">
          <NumberInput id="s-vatp" value={s.vatPercent} onChange={(v) => update({ vatPercent: v ?? 0 })} unit="%" step={1} disabled={!s.vatEnabled} />
        </Field>
        <Field label="Para gösterimi" htmlFor="s-cur">
          <Select
            id="s-cur"
            value={s.currencyStyle}
            onChange={(v) => update({ currencyStyle: v as AppSettings['currencyStyle'] })}
            options={[
              { value: 'suffix', label: '1.234,56 ₺' },
              { value: 'prefix', label: '₺1.234,56' },
              { value: 'tl', label: '1.234,56 TL' },
            ]}
          />
        </Field>
        <ToggleRow
          id="s-compact"
          label="Tam sayılarda kuruşu gizle"
          description={`${formatTL(309, { compactDecimals: true })} / ${formatTL(309, { compactDecimals: false })}`}
          checked={s.compactDecimals}
          onChange={(v) => update({ compactDecimals: v })}
        />
        <Field
          label="USD kuru"
          htmlFor="s-usd"
          estimated={isDefault(s, 'usdRate')}
          info="Etsy gibi dolar bazlı sabit ücretleri TL’ye çevirmek için. Otomatik güncellenmez; güncel kuru elle gir."
        >
          <NumberInput id="s-usd" value={s.usdRate} onChange={(v) => update({ usdRate: v ?? 0 })} unit="₺/$" step={0.5} />
        </Field>
      </div>
    </Section>
  )
}

export function AppearanceSection() {
  const theme = useUI((s) => s.theme)
  const setTheme = useUI((s) => s.setTheme)
  return (
    <Section title="Görünüm" icon={<Palette className="size-4" />}>
      <Segmented<ThemePref>
        aria-label="Tema"
        value={theme}
        onChange={setTheme}
        className="w-full max-w-sm"
        options={[
          { value: 'dark', label: 'Koyu' },
          { value: 'light', label: 'Açık' },
          { value: 'system', label: 'Sistem' },
        ]}
      />
    </Section>
  )
}
