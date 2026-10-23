import * as RDialog from '@radix-ui/react-dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Printer as PrinterIcon, Sparkles, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { LogoMark } from '@/app/Logo'
import { freshDraft } from '@/app/useNewProduct'
import { Badge, Button, Field, NumberInput, Slider } from '@/components/ui'
import { DEFAULT_PRINTER_LIFE_HOURS, PRINTER_PRESETS, listPrinters, presetInfo, savePrinter, type PrinterPreset } from '@/db'
import { useCalculator } from '@/features/calculator/store'
import { ExamplePrice, FALLBACK_PRINTER } from '@/features/settings/ExamplePrice'
import { cn } from '@/lib/cn'
import { formatNumber, formatTL } from '@/lib/format'
import { useSettings, useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toast'
import { useUI } from '@/store/ui'

const STEPS = ['Yazıcın', 'Elektrik', 'Oranların'] as const

const KWH_PRESETS = [
  { label: 'Mesken düşük kademe', value: 2.8 },
  { label: 'Mesken yüksek kademe', value: 4.1 },
  { label: 'Ticarethane', value: 4.8 },
]

/** İlk açılış sihirbazı: 3 adım, her an atlanabilir */
export default function OnboardingWizard() {
  const settings = useSettings()
  const update = useSettingsStore((s) => s.update)
  const setOpen = useUI((s) => s.setWizardOpen)
  const printers = useLiveQuery(listPrinters, [], [])
  const [step, setStep] = useState(0)
  const [preset, setPreset] = useState<PrinterPreset | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [kwh, setKwh] = useState<number | null>(settings.kwhPrice)
  const [mult, setMult] = useState(settings.costMultiplier)
  const [hourly, setHourly] = useState(settings.hourlyProfit)

  const info = preset ? presetInfo(preset) : null
  const examplePrinter = info
    ? { ...FALLBACK_PRINTER, price: price ?? FALLBACK_PRINTER.price, watts: info.watts, maintenancePerHour: info.maintenancePerHour }
    : undefined

  async function close(complete: boolean) {
    if (complete) {
      if (info) {
        await savePrinter({
          name: info.key === 'other' ? 'Yazıcım' : info.name,
          preset: info.key,
          price: price ?? 0,
          salvageValue: 0,
          lifeHours: DEFAULT_PRINTER_LIFE_HOURS,
          watts: info.watts,
          maintenancePerHour: info.maintenancePerHour,
          isDefault: true,
        })
      }
      await update({ kwhPrice: kwh ?? settings.kwhPrice, costMultiplier: mult, hourlyProfit: hourly, onboarded: true })
      // Dokunulmamış taslak yeni varsayılan yazıcıyı alsın
      const calc = useCalculator.getState()
      if (!calc.dirty && !calc.draft.productId) calc.replace(await freshDraft())
      toast('Hazırsın! İlk ürününü fiyatlayabilirsin.', { tone: 'success' })
    } else if (!settings.onboarded) {
      await update({ onboarded: true })
    }
    setOpen(false)
  }

  const last = step === STEPS.length - 1

  return (
    <RDialog.Root open onOpenChange={(o) => !o && void close(false)}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-md" />
        <RDialog.Content className="solid-surface fixed inset-x-0 bottom-0 z-[61] flex max-h-[94dvh] flex-col rounded-t-[24px] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(720px,calc(100dvh-32px))] sm:w-[calc(100vw-32px)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card data-[state=open]:animate-[dialog-in_200ms_ease]">
          <div className="flex items-center gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
            <LogoMark />
            <div className="min-w-0 flex-1">
              <RDialog.Title className="truncate text-base font-semibold tracking-tight">Katman’a hoş geldin</RDialog.Title>
              <RDialog.Description className="truncate text-xs text-fg-3">
                Adım {step + 1}/3 · {STEPS[step]} · istediğin an atlayabilirsin
              </RDialog.Description>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sihirbazı kapat" onClick={() => void close(false)}>
              <X />
            </Button>
          </div>

          <div className="mt-4 flex gap-1.5 px-5 sm:px-7" aria-hidden>
            {STEPS.map((s, i) => (
              <div key={s} className={cn('h-1 flex-1 rounded-full', i <= step ? 'brand-gradient' : 'bg-surface-strong')} />
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
              >
                {step === 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                      <PrinterIcon className="size-5 text-brand-2" /> Hangi yazıcıyla basıyorsun?
                    </h2>
                    <p className="mt-1.5 text-sm text-fg-2">
                      Amortisman ve elektrik buradan hesaplanır. Watt değerleri tahmini ortalamadır.
                      {printers.length > 0 && ` Zaten ${printers.length} yazıcın var — seçersen yeni bir tane eklenir.`}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Yazıcı modeli">
                      {PRINTER_PRESETS.map((p) => {
                        const active = preset === p.key
                        return (
                          <button
                            key={p.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setPreset(active ? null : p.key)}
                            className={cn(
                              'relative flex min-h-[72px] flex-col items-start justify-center rounded-[14px] border px-3.5 py-2.5 text-left transition-colors',
                              active ? 'border-brand-2/60 bg-brand-2/10' : 'border-line bg-inset hover:border-line-strong',
                            )}
                          >
                            <span className="text-[13px] font-medium text-fg">{p.name.replace('Bambu Lab ', '')}</span>
                            <span className="text-[11px] text-fg-3">{p.key === 'other' ? 'özel' : `~${p.watts} W`}</span>
                            {active && <Check className="absolute top-2.5 right-2.5 size-4 text-brand-2" />}
                          </button>
                        )
                      })}
                    </div>
                    {preset && (
                      <Field label="Aldığın fiyat" htmlFor="wz-price" className="mt-5" hint="Boş bırakırsan amortisman 0 sayılır; sonra Ayarlar’dan girebilirsin.">
                        <NumberInput id="wz-price" value={price} onChange={setPrice} unit="₺" step={500} placeholder="ör. 35.000" autoFocus />
                      </Field>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                      <Zap className="size-5 text-brand-2" /> Elektrik birim fiyatın
                    </h2>
                    <p className="mt-1.5 text-sm text-fg-2">
                      Faturandaki birim fiyatı gir. Mesken düşük kademe ~2,6–2,9 TL, yüksek kademe ~3,9–4,3 TL, ticarethane ~4,8 TL
                      civarı. 2026’da birkaç kez zam geldi.
                    </p>
                    <Field label="kWh fiyatı" htmlFor="wz-kwh" className="mt-5">
                      <NumberInput id="wz-kwh" value={kwh} onChange={setKwh} unit="₺/kWh" step={0.1} />
                    </Field>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {KWH_PRESETS.map((k) => (
                        <button
                          key={k.label}
                          type="button"
                          onClick={() => setKwh(k.value)}
                          className={cn(
                            'h-11 rounded-full border px-3.5 text-xs transition-colors lg:h-9',
                            kwh === k.value ? 'border-brand-2/50 bg-brand-2/10 text-fg' : 'border-line text-fg-2 hover:border-line-strong',
                          )}
                        >
                          {k.label} ~{formatNumber(k.value)}
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-fg-3">
                      <Badge tone="warning" size="xs" className="mr-1.5">
                        tahmini
                      </Badge>
                      Bu aralıklar yaklaşık değerlerdir; en doğrusu kendi faturan.
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                      <Sparkles className="size-5 text-brand-2" /> Oranların
                    </h2>
                    <p className="mt-1.5 text-sm text-fg-2">İki fiyat önerisi bu iki sayıdan çıkar. Örnek fiyat anında güncellenir.</p>

                    <div className="mt-5 grid gap-5">
                      <div>
                        <div className="flex items-baseline justify-between gap-3">
                          <label className="text-[13px] font-medium text-fg-2">Maliyet çarpanı · Fiyat A</label>
                          <span className="tnum text-lg font-semibold">× {formatNumber(mult)}</span>
                        </div>
                        <Slider aria-label="Maliyet çarpanı" value={mult} onChange={setMult} min={1} max={5} step={0.1} />
                        <p className="text-xs text-fg-3">Fiyat A = maliyet × çarpan</p>
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between gap-3">
                          <label className="text-[13px] font-medium text-fg-2">Saatlik kâr ücreti · Fiyat B</label>
                          <span className="tnum text-lg font-semibold">{formatTL(hourly, { compactDecimals: true })}/sa</span>
                        </div>
                        <Slider aria-label="Saatlik kâr ücreti" value={hourly} onChange={setHourly} min={0} max={150} step={5} />
                        <p className="text-xs text-fg-3">Fiyat B = maliyet + baskı saati × ücret</p>
                      </div>
                    </div>
                    <ExamplePrice
                      className="mt-5"
                      settingsOverride={{ costMultiplier: mult, hourlyProfit: hourly, kwhPrice: kwh ?? settings.kwhPrice }}
                      printer={examplePrinter}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 border-t border-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-7">
            <Button variant="ghost" onClick={() => void close(false)}>
              Atla
            </Button>
            <div className="flex-1" />
            {step > 0 && (
              <Button onClick={() => setStep(step - 1)} aria-label="Geri">
                <ArrowLeft />
              </Button>
            )}
            <Button variant="primary" onClick={() => (last ? void close(true) : setStep(step + 1))}>
              {last ? 'Bitir' : 'İleri'}
              {last ? <Check /> : <ArrowRight />}
            </Button>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
