import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Button, Dialog, Field, Input, NumberInput, Select, Switch } from '@/components/ui'
import {
  DEFAULT_PRINTER_LIFE_HOURS,
  PRINTER_PRESETS,
  presetInfo,
  savePrinter,
  type Printer,
  type PrinterPreset,
} from '@/db'
import { formatTL } from '@/lib/format'
import { printerHourlyDepreciation } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

const printerSchema = z.object({
  name: z.string().trim().min(1, 'Bir ad gir'),
  price: z.number().min(0),
  salvageValue: z.number().min(0),
  lifeHours: z.number().positive('Ömür 0’dan büyük olmalı'),
  watts: z.number().min(0),
  maintenancePerHour: z.number().min(0),
})

type FormState = {
  preset: PrinterPreset
  name: string
  price: number | null
  salvageValue: number | null
  lifeHours: number | null
  watts: number | null
  maintenancePerHour: number | null
  startHours: number | null
  isDefault: boolean
}

function initial(p?: Printer | null): FormState {
  if (p) return { ...p }
  const preset = presetInfo('p1s')
  return {
    preset: preset.key,
    name: preset.name,
    price: null,
    salvageValue: null,
    lifeHours: DEFAULT_PRINTER_LIFE_HOURS,
    watts: preset.watts,
    maintenancePerHour: preset.maintenancePerHour,
    startHours: null,
    isDefault: false,
  }
}

export const PRESET_OPTIONS = PRINTER_PRESETS.map((p) => ({
  value: p.key,
  label: p.name,
  description: `~${p.watts} W ortalama (tahmini)`,
}))

interface PrinterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  printer?: Printer | null
  onSaved?: (p: Printer) => void
}

export function PrinterDialog({ open, onOpenChange, printer, onSaved }: PrinterDialogProps) {
  const settings = useSettings()
  const [f, setF] = useState<FormState>(() => initial(printer))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setF(initial(printer))
      setErrors({})
    }
  }, [open, printer])

  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }))

  function choosePreset(key: string) {
    const info = presetInfo(key as PrinterPreset)
    const nameIsPreset = PRINTER_PRESETS.some((p) => p.name === f.name) || !f.name
    set({
      preset: info.key,
      watts: info.watts,
      maintenancePerHour: info.maintenancePerHour,
      name: nameIsPreset ? (info.key === 'other' ? '' : info.name) : f.name,
    })
  }

  const hourly =
    printerHourlyDepreciation(f.price ?? 0, f.salvageValue ?? 0, f.lifeHours ?? 0) +
    (f.maintenancePerHour ?? 0) +
    ((f.watts ?? 0) / 1000) * settings.kwhPrice

  async function submit() {
    const parsed = printerSchema.safeParse({
      name: f.name,
      price: f.price ?? 0,
      salvageValue: f.salvageValue ?? 0,
      lifeHours: f.lifeHours ?? 0,
      watts: f.watts ?? 0,
      maintenancePerHour: f.maintenancePerHour ?? 0,
    })
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    const saved = await savePrinter({ ...parsed.data, id: printer?.id, preset: f.preset, isDefault: f.isDefault, startHours: f.startHours ?? 0 })
    toast(printer ? 'Yazıcı güncellendi' : 'Yazıcı eklendi', { tone: 'success' })
    onSaved?.(saved)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={printer ? 'Yazıcıyı düzenle' : 'Yazıcı ekle'}
      description="Amortisman, elektrik ve bakım maliyeti bu bilgilerden hesaplanır."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={submit}>
            Kaydet
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field label="Model" htmlFor="pr-preset" className="sm:col-span-2">
          <Select id="pr-preset" value={f.preset} onChange={choosePreset} options={PRESET_OPTIONS} />
        </Field>
        <Field label="Ad" htmlFor="pr-name" error={errors.name} className="sm:col-span-2">
          <Input id="pr-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="ör. P1S — Atölye" />
        </Field>
        <Field label="Satın alma fiyatı" htmlFor="pr-price" info="Yazıcıya ödediğin toplam tutar (AMS dahil).">
          <NumberInput id="pr-price" value={f.price} onChange={(v) => set({ price: v })} unit="₺" step={500} placeholder="ör. 35.000" />
        </Field>
        <Field label="Hurda / ikinci el değeri" htmlFor="pr-salvage" info="Ömrünün sonunda satarsan eline geçeceğini tahmin ettiğin tutar.">
          <NumberInput id="pr-salvage" value={f.salvageValue} onChange={(v) => set({ salvageValue: v })} unit="₺" step={500} placeholder="0" />
        </Field>
        <Field label="Ömür" htmlFor="pr-life" error={errors.lifeHours} info="Yazıcının toplam çalışma saati beklentisi. Varsayılan 5.000 saat.">
          <NumberInput id="pr-life" value={f.lifeHours} onChange={(v) => set({ lifeHours: v })} unit="saat" step={500} />
        </Field>
        <Field
          label="Ortalama güç"
          htmlFor="pr-watts"
          estimated={presetInfo(f.preset).watts === f.watts}
          info="Baskı sırasındaki ortalama tüketim. Priz wattmetresiyle ölçüp düzeltebilirsin."
        >
          <NumberInput id="pr-watts" value={f.watts} onChange={(v) => set({ watts: v })} unit="W" step={5} />
        </Field>
        <Field
          label="Bakım / sarf"
          htmlFor="pr-maint"
          className="sm:col-span-2"
          info="Nozzle, PTFE tüp, plaka, yağ gibi sarf malzemelerinin saat başına düşen tahmini maliyeti."
        >
          <NumberInput id="pr-maint" value={f.maintenancePerHour} onChange={(v) => set({ maintenancePerHour: v })} unit="₺/sa" step={0.25} />
        </Field>
        <Field
          label="Önceki kullanım"
          htmlFor="pr-start"
          className="sm:col-span-2"
          info="Katman’ı kullanmaya başlamadan önce bu yazıcıyla basılmış yaklaşık saat (Bambu Handy / yazıcı ekranında görülebilir). Toplam saate eklenir."
        >
          <NumberInput id="pr-start" value={f.startHours} onChange={(v) => set({ startHours: v })} unit="saat" step={50} placeholder="0" />
        </Field>
        <div className="inset-surface flex items-center justify-between gap-3 rounded-ctl px-4 py-3 sm:col-span-2">
          <div className="min-w-0">
            <div className="text-[13px] text-fg-2">Saatlik makine maliyeti</div>
            <div className="text-xs text-fg-3">amortisman + bakım + elektrik</div>
          </div>
          <div className="tnum text-lg font-semibold">{formatTL(hourly)}</div>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 sm:col-span-2">
          <span className="text-sm text-fg-2">Varsayılan yazıcı</span>
          <Switch checked={f.isDefault} onChange={(v) => set({ isDefault: v })} aria-label="Varsayılan yazıcı" />
        </label>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
