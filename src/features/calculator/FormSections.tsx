import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Hand, Info, Layers, Link2, Plus, Printer as PrinterIcon, Trash2, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Button,
  DurationInput,
  Field,
  Input,
  NumberInput,
  Section,
  Select,
  type SelectOption,
} from '@/components/ui'
import { DEFAULT_CATEGORIES, listCategories, type Printer } from '@/db'
import { PrinterDialog } from '@/features/printers/PrinterDialog'
import { formatGram, formatHours, formatTL, parseGram } from '@/lib/format'
import { gramPrice, printerHourlyDepreciation } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { resolveFilament, type Catalog } from './draft'
import { filamentOptions } from './filamentOptions'
import { PhotoInput } from './PhotoInput'
import type { ProductErrors } from './save'
import { useCalculator } from './store'
import { TagInput } from './TagInput'

/* ───────────── Temel bilgiler ───────────── */

export function BasicsSection({ errors }: { errors: ProductErrors }) {
  const d = useCalculator((s) => s.draft)
  const set = useCalculator((s) => s.set)
  const existing = useLiveQuery(listCategories, [], [])
  const categories = useMemo(() => Array.from(new Set([...existing, ...DEFAULT_CATEGORIES])), [existing])

  return (
    <Section title="Temel bilgiler" icon={<Info className="size-4" />}>
      <div className="flex min-w-0 gap-4">
        <PhotoInput value={d.photo} onChange={(photo) => set({ photo })} />
        <div className="grid min-w-0 flex-1 gap-4">
          <Field label="Ürün adı" htmlFor="p-name" error={errors.name}>
            <Input
              id="p-name"
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="ör. Ejderha anahtarlık"
              aria-invalid={!!errors.name || undefined}
              maxLength={120}
            />
          </Field>
          <Field label="Kategori" htmlFor="p-cat" className="hidden @md:block">
            <CategoryInput value={d.category} onChange={(category) => set({ category })} categories={categories} />
          </Field>
        </div>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 @md:grid-cols-2">
        <Field label="Kategori" htmlFor="p-cat-m" className="@md:hidden">
          <CategoryInput id="p-cat-m" value={d.category} onChange={(category) => set({ category })} categories={categories} />
        </Field>
        <Field label="MakerWorld / model linki" htmlFor="p-link" error={errors.link}>
          <Input
            id="p-link"
            type="url"
            inputMode="url"
            value={d.link}
            onChange={(e) => set({ link: e.target.value })}
            placeholder="https://makerworld.com/…"
            leading={<Link2 />}
            aria-invalid={!!errors.link || undefined}
          />
        </Field>
        <Field label="Etiketler" htmlFor="p-tags" hint="Enter veya virgülle ekle">
          <TagInput id="p-tags" value={d.tags} onChange={(tags) => set({ tags })} />
        </Field>
      </div>
    </Section>
  )
}

function CategoryInput({
  value,
  onChange,
  categories,
  id = 'p-cat',
}: {
  value: string
  onChange: (v: string) => void
  categories: string[]
  id?: string
}) {
  return (
    <>
      <Input id={id} list={`${id}-list`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="ör. Anahtarlık" maxLength={60} />
      <datalist id={`${id}-list`}>
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  )
}

/* ───────────── Filament ───────────── */

export function FilamentSection({ catalog }: { catalog: Catalog }) {
  const filaments = useCalculator((s) => s.draft.filaments)
  const addFilament = useCalculator((s) => s.addFilament)
  const updateFilament = useCalculator((s) => s.updateFilament)
  const removeFilament = useCalculator((s) => s.removeFilament)

  const options = useMemo(() => filamentOptions(catalog), [catalog])

  let totalGram = 0
  let totalCost = 0
  const lineCosts = filaments.map((f) => {
    const r = resolveFilament(f.filamentId, catalog)
    const g = (f.gram ?? 0) + (f.purgeGram ?? 0)
    const c = r ? g * gramPrice(r.spoolPrice, r.spoolGrams) : 0
    totalGram += g
    totalCost += c
    return c
  })

  return (
    <Section
      title="Filament"
      description="Bambu Studio’daki gram değerlerini yapıştırabilirsin (ör. 45.21 g)."
      icon={<Layers className="size-4" />}
    >
      <div className="flex flex-col gap-3">
        {filaments.map((f, i) => (
          <div key={f.key} className="inset-surface grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 rounded-[14px] p-2.5 @xl:grid-cols-[minmax(0,1fr)_120px_120px_44px]">
            <div className="col-span-3 min-w-0 @xl:col-span-1">
              <label htmlFor={`fil-${f.key}`} className="sr-only">
                Filament {i + 1}
              </label>
              <Select
                id={`fil-${f.key}`}
                value={f.filamentId}
                onChange={(filamentId) => updateFilament(f.key, { filamentId })}
                options={options}
                placeholder="Filament seç"
              />
            </div>
            <NumberInput
              aria-label={`Filament ${i + 1} gram`}
              value={f.gram}
              onChange={(gram) => updateFilament(f.key, { gram })}
              parse={parseGram}
              unit="g"
              placeholder="gram"
              step={1}
            />
            <NumberInput
              aria-label={`Filament ${i + 1} purge (renk değişim atığı) gram`}
              value={f.purgeGram}
              onChange={(purgeGram) => updateFilament(f.key, { purgeGram })}
              parse={parseGram}
              unit="g"
              placeholder="purge"
              step={1}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Filament ${i + 1} satırını sil`}
              onClick={() => removeFilament(f.key)}
              disabled={filaments.length === 1}
              className="size-11"
            >
              <Trash2 />
            </Button>
            <div className="tnum col-span-3 -mt-0.5 flex justify-between px-1 text-[11px] text-fg-3 @xl:col-span-4">
              <span>{f.purgeGram ? 'gram + purge' : 'purge: AMS renk değişim atığı'}</span>
              <span>{formatTL(lineCosts[i])}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" onClick={() => addFilament(catalog.filamentTypes[0]?.id ?? '')}>
          <Plus />
          Satır ekle
        </Button>
        <span className="tnum text-[13px] text-fg-2">
          Toplam {formatGram(totalGram)} · <span className="font-medium text-fg">{formatTL(totalCost)}</span>
        </span>
      </div>
    </Section>
  )
}

/* ───────────── Baskı ───────────── */

export function PrintSection({ printers }: { printers: Printer[] }) {
  const settings = useSettings()
  const d = useCalculator((s) => s.draft)
  const set = useCalculator((s) => s.set)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Printer | null>(null)
  const printer = printers.find((p) => p.id === d.printerId) ?? null
  const units = Math.max(1, Math.floor(d.unitsPerPlate ?? 1) || 1)

  const options: SelectOption[] = printers.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <PrinterIcon className="size-4 text-fg-3" />,
    description: `${p.watts} W${p.price ? ` · ${formatTL(p.price, { compactDecimals: true })}` : ' · fiyat girilmedi'}`,
  }))

  const hourly = printer
    ? printerHourlyDepreciation(printer.price, printer.salvageValue, printer.lifeHours) +
      printer.maintenancePerHour +
      (printer.watts / 1000) * settings.kwhPrice
    : 0

  return (
    <Section title="Baskı" icon={<Clock className="size-4" />}>
      <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
        <Field
          label="Yazıcı"
          htmlFor="p-printer"
          className="@xl:col-span-2"
          hint={printer ? `Saatlik makine maliyeti ${formatTL(hourly)} (amortisman + bakım + elektrik)` : undefined}
        >
          <div className="flex min-w-0 gap-2">
            <div className="min-w-0 flex-1">
              {printers.length ? (
                <Select id="p-printer" value={d.printerId ?? ''} onChange={(printerId) => set({ printerId })} options={options} placeholder="Yazıcı seç" />
              ) : (
                <div className="inset-surface flex h-11 items-center rounded-ctl px-3 text-sm text-fg-3">Henüz yazıcı yok</div>
              )}
            </div>
            {printer && (
              <Button
                aria-label="Yazıcıyı düzenle"
                onClick={() => {
                  setEditing(printer)
                  setDialogOpen(true)
                }}
              >
                Düzenle
              </Button>
            )}
            <Button
              aria-label="Yazıcı ekle"
              size={printers.length ? 'icon' : 'md'}
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus />
              {!printers.length && 'Yazıcı ekle'}
            </Button>
          </div>
        </Field>
        <Field label="Baskı süresi" htmlFor="p-hours" info="Bambu Studio’daki tahmini süreyi olduğu gibi yapıştırabilirsin: “1h 23m”, “4:30”, “4s 30dk”, “4,5”.">
          <DurationInput id="p-hours" value={d.printHours} onChange={(printHours) => set({ printHours })} />
        </Field>
        <Field
          label="Plaka başı adet"
          htmlFor="p-units"
          info="Bir baskıda kaç adet çıkıyor? Baskı maliyeti adetlere bölünür; işçilik ve ekler adet başıdır."
          hint={units > 1 && d.printHours ? `Adet başı ${formatHours(d.printHours / units)}` : 'Varsayılan 1'}
        >
          <NumberInput
            id="p-units"
            value={d.unitsPerPlate}
            onChange={(unitsPerPlate) => set({ unitsPerPlate: unitsPerPlate === null ? null : Math.round(unitsPerPlate) })}
            unit="adet"
            min={1}
            step={1}
          />
        </Field>
      </div>
      <PrinterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        printer={editing}
        onSaved={(p) => {
          if (!editing) set({ printerId: p.id })
        }}
      />
    </Section>
  )
}

/* ───────────── İşçilik & ekler ───────────── */

export function LaborSection() {
  const settings = useSettings()
  const d = useCalculator((s) => s.draft)
  const set = useCalculator((s) => s.set)
  const addExtra = useCalculator((s) => s.addExtra)
  const updateExtra = useCalculator((s) => s.updateExtra)
  const removeExtra = useCalculator((s) => s.removeExtra)
  const laborCost = ((d.laborMinutes ?? 0) / 60) * settings.laborRate

  return (
    <Section title="İşçilik & ekler" icon={<Hand className="size-4" />}>
      <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
        <Field
          label="El emeği"
          htmlFor="p-labor"
          info="Destek söküm, temizlik, zımpara, montaj, boyama… Adet başı süre."
          hint={`${formatTL(settings.laborRate, { compactDecimals: true })}/saat → ${formatTL(laborCost)}`}
        >
          <NumberInput id="p-labor" value={d.laborMinutes} onChange={(laborMinutes) => set({ laborMinutes })} unit="dk" step={5} placeholder="0" />
        </Field>
        <Field label="Ambalaj" htmlFor="p-pack" hint="Kutu, poşet, etiket, kâğıt dolgu">
          <NumberInput id="p-pack" value={d.packaging} onChange={(packaging) => set({ packaging })} unit="₺" step={1} placeholder="0" />
        </Field>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-fg-2">
          <Zap className="size-3.5" />
          Ek parçalar
        </div>
        {d.extras.length === 0 && (
          <p className="mb-3 text-xs text-fg-3">Anahtarlık halkası, mıknatıs, LED, vida, boya… (adet başı)</p>
        )}
        <div className="flex flex-col gap-2">
          {d.extras.map((e, i) => (
            <div key={e.key} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,120px)_44px] gap-2">
              <Input
                aria-label={`Ek parça ${i + 1} adı`}
                value={e.name}
                onChange={(ev) => updateExtra(e.key, { name: ev.target.value })}
                placeholder="ör. Anahtarlık halkası"
              />
              <NumberInput
                aria-label={`Ek parça ${i + 1} tutarı`}
                value={e.amount}
                onChange={(amount) => updateExtra(e.key, { amount })}
                unit="₺"
                step={1}
                placeholder="0"
              />
              <Button variant="ghost" size="icon" aria-label={`Ek parça ${i + 1} sil`} onClick={() => removeExtra(e.key)} className="size-11">
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={addExtra}>
          <Plus />
          Ek parça ekle
        </Button>
      </div>
    </Section>
  )
}

/* ───────────── Hızlı mod ───────────── */

export function QuickSection() {
  const d = useCalculator((s) => s.draft)
  const set = useCalculator((s) => s.set)
  return (
    <Section
      title="Maliyet & süre"
      description="Toplam maliyeti biliyorsan yeter — fiyatlar aynı formüllerle çıkar."
      icon={<Zap className="size-4" />}
    >
      <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
        <Field label="Toplam maliyet (adet başı)" htmlFor="q-cost" info="Filament, elektrik, işçilik, ambalaj — hepsi dahil tek rakam.">
          <NumberInput id="q-cost" value={d.quickCost} onChange={(quickCost) => set({ quickCost })} unit="₺" step={5} placeholder="ör. 150" />
        </Field>
        <Field label="Baskı süresi (adet başı)" htmlFor="q-hours" info="Fiyat B ve saat başı kâr için gerekli.">
          <DurationInput id="q-hours" value={d.quickHours} onChange={(quickHours) => set({ quickHours })} />
        </Field>
      </div>
    </Section>
  )
}
