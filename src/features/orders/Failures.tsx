import { Flame, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, DurationInput, Field, GlassCard, NumberInput, Select, Textarea } from '@/components/ui'
import { addFailure, deleteFailure, FAILURE_REASONS, restoreFailure, type Failure, type FailureReason } from '@/db'
import { filamentOptions } from '@/features/calculator/filamentOptions'
import { resolveFilament, type Catalog } from '@/features/calculator/draft'
import { formatDate, formatGram, formatHours, formatNumber, parseGram } from '@/lib/format'
import { useSettings, useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toast'

export function FailureDialog({ open, onOpenChange, catalog }: { open: boolean; onOpenChange: (o: boolean) => void; catalog: Catalog }) {
  const options = useMemo(() => filamentOptions(catalog), [catalog])
  const defaultPrinter = (catalog.printers.find((p) => p.isDefault) ?? catalog.printers[0])?.id ?? ''
  const [printerId, setPrinterId] = useState(defaultPrinter)
  const [filamentId, setFilamentId] = useState('')
  const [grams, setGrams] = useState<number | null>(null)
  const [hours, setHours] = useState<number | null>(null)
  const [reason, setReason] = useState<FailureReason>('adhesion')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPrinterId(defaultPrinter)
    setFilamentId(catalog.spools[0]?.id ?? catalog.filamentTypes[0]?.id ?? '')
    setGrams(null)
    setHours(null)
    setReason('adhesion')
    setNote('')
    setError(null)
  }, [open]) // yalnızca açılışta sıfırla

  async function save() {
    if (!filamentId || !(grams && grams > 0)) {
      setError('Filament ve harcanan gramı gir')
      return
    }
    const f = await addFailure({ printerId: printerId || null, filamentId, grams, hours: hours ?? 0, reason, note: note.trim(), orderId: null })
    const missing = f.consumption?.missing.reduce((s, m) => s + m.grams, 0) ?? 0
    toast(`Fire kaydedildi · ${formatGram(grams)} stoktan düşüldü${missing ? ` (${formatGram(missing)} stokta yoktu)` : ''}`, {
      tone: 'success',
      action: { label: 'Geri al', onClick: () => void deleteFailure(f.id) },
    })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Başarısız baskıyı kaydet"
      description="Harcanan filament stoktan düşülür; gerçek fire oranın hesaplanır."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sebep" htmlFor="fl-reason" className="sm:col-span-2">
          <Select id="fl-reason" value={reason} onChange={(v) => setReason(v as FailureReason)} options={FAILURE_REASONS.map((r) => ({ value: r.value, label: r.label }))} />
        </Field>
        <Field label="Filament" htmlFor="fl-fil" error={error} className="sm:col-span-2">
          <Select id="fl-fil" value={filamentId} onChange={setFilamentId} options={options} placeholder="Filament seç" />
        </Field>
        <Field label="Harcanan" htmlFor="fl-grams">
          <NumberInput id="fl-grams" value={grams} onChange={setGrams} parse={parseGram} unit="g" placeholder="ör. 35" />
        </Field>
        <Field label="Yazıcı" htmlFor="fl-printer">
          <Select id="fl-printer" value={printerId} onChange={setPrinterId} options={catalog.printers.map((p) => ({ value: p.id, label: p.name }))} placeholder="Yazıcı seç" />
        </Field>
        <Field label="Geçen süre" htmlFor="fl-hours" className="sm:col-span-2">
          <DurationInput id="fl-hours" value={hours} onChange={setHours} />
        </Field>
        <Field label="Not" htmlFor="fl-note" className="sm:col-span-2">
          <Textarea id="fl-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" placeholder="ör. Plaka yağlıydı" />
        </Field>
      </div>
    </Dialog>
  )
}

/** "Gerçek fire oranın %8, ayarın %5 — güncellemek ister misin?" */
export function WasteBanner({ real, count }: { real: number | null; count: number }) {
  const settings = useSettings()
  const update = useSettingsStore((s) => s.update)
  if (real === null || count === 0) return null
  const rounded = Math.round(real * 10) / 10
  const diff = rounded - settings.wastePercent
  if (Math.abs(diff) < 1) return null
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-[16px] border border-info/30 bg-info/10 px-4 py-3" role="status">
      <Flame className="size-5 shrink-0 text-info" />
      <p className="min-w-0 flex-1 text-sm text-fg">
        Gerçek fire oranın <b>%{formatNumber(rounded, 1)}</b>, ayarın <b>%{formatNumber(settings.wastePercent, 1)}</b> — güncellemek ister misin?
      </p>
      <Button
        size="sm"
        onClick={async () => {
          const prev = settings.wastePercent
          await update({ wastePercent: rounded })
          toast(`Fire oranı %${formatNumber(rounded, 1)} yapıldı — ürün fiyatları yeniden hesaplanır`, {
            tone: 'success',
            action: { label: 'Geri al', onClick: () => void update({ wastePercent: prev }) },
          })
        }}
      >
        %{formatNumber(rounded, 1)} yap
      </Button>
    </div>
  )
}

const REASON_LABEL = Object.fromEntries(FAILURE_REASONS.map((r) => [r.value, r.label])) as Record<FailureReason, string>

export function FailuresCard({ failures, catalog, waste }: { failures: Failure[]; catalog: Catalog; waste: { failedGrams: number; usedGrams: number; real: number | null } }) {
  const [open, setOpen] = useState(false)
  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Flame className="size-4 text-brand-1" /> Fire kayıtları
          </h2>
          <p className="tnum text-xs text-fg-3">
            {formatGram(waste.failedGrams)} fire · {formatGram(waste.usedGrams)} başarılı baskı
            {waste.real !== null && ` · gerçek fire %${formatNumber(waste.real, 1)}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Fire kaydet
        </Button>
      </div>
      {failures.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {failures.slice(0, 5).map((f) => (
            <li key={f.id} className="flex min-w-0 items-center gap-2 text-xs">
              <span className="tnum w-24 shrink-0 text-fg-3">{formatDate(f.at)}</span>
              <span className="min-w-0 flex-1 truncate text-fg-2">
                {REASON_LABEL[f.reason]} · {resolveFilament(f.filamentId, catalog)?.name ?? 'filament'} · {formatGram(f.grams)}
                {f.hours > 0 && ` · ${formatHours(f.hours)}`}
              </span>
              <button
                type="button"
                aria-label="Fire kaydını sil"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-3 hover:bg-surface hover:text-danger"
                onClick={async () => {
                  const removed = await deleteFailure(f.id)
                  if (removed) toast('Fire kaydı silindi, filament stoğa iade edildi', { action: { label: 'Geri al', onClick: () => void restoreFailure(removed) } })
                }}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <FailureDialog open={open} onOpenChange={setOpen} catalog={catalog} />
    </GlassCard>
  )
}
