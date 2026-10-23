import { useLiveQuery } from 'dexie-react-hooks'
import { Disc3, Pencil, Plus, Scale, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import {
  Badge,
  Button,
  ColorSwatch,
  Dialog,
  EmptyState,
  Field,
  GlassCard,
  Input,
  NumberInput,
  ProgressBar,
  Select,
  Skeleton,
  StatCard,
  Textarea,
} from '@/components/ui'
import { deleteSpool, listFilamentTypes, listSpools, restoreSpool, saveSpool, updateSpool, type FilamentType, type Spool } from '@/db'
import { formatDate, formatGram, formatTL, parseGram } from '@/lib/format'
import { gramPrice, isLowStock, remainingFromWeight, weightedAverageGramPrice } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

/* ───────────── Makara formu ───────────── */

const spoolSchema = z.object({
  filamentTypeId: z.string().min(1, 'Tür seç'),
  colorName: z.string().trim().min(1, 'Renk adı gir'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'HEX renk gir (ör. #FF3D77)'),
  spoolPrice: z.number().min(0),
  spoolGrams: z.number().positive('Makara gramı 0’dan büyük olmalı'),
  remainingGrams: z.number().min(0),
})

type Form = {
  filamentTypeId: string
  brand: string
  colorName: string
  color: string
  spoolPrice: number | null
  spoolGrams: number | null
  remainingGrams: number | null
  emptySpoolWeight: number | null
  purchaseDate: string
  supplier: string
  note: string
}

const today = () => new Date().toISOString().slice(0, 10)

function initial(s: Spool | null, types: FilamentType[]): Form {
  if (s) return { ...s, purchaseDate: s.purchaseDate ?? '' }
  const t = types[0]
  return {
    filamentTypeId: t?.id ?? '',
    brand: 'Bambu Lab',
    colorName: '',
    color: t?.color ?? '#FF3D77',
    spoolPrice: t?.spoolPrice ?? null,
    spoolGrams: 1000,
    remainingGrams: 1000,
    emptySpoolWeight: null,
    purchaseDate: today(),
    supplier: '',
    note: '',
  }
}

function SpoolDialog({ open, onOpenChange, spool, types }: { open: boolean; onOpenChange: (o: boolean) => void; spool: Spool | null; types: FilamentType[] }) {
  const [f, setF] = useState<Form>(() => initial(spool, types))
  const [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => {
    if (open) {
      setF(initial(spool, types))
      setErrors({})
    }
  }, [open, spool, types])
  const set = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }))

  async function submit() {
    const parsed = spoolSchema.safeParse({
      filamentTypeId: f.filamentTypeId,
      colorName: f.colorName,
      color: f.color,
      spoolPrice: f.spoolPrice ?? 0,
      spoolGrams: f.spoolGrams ?? 0,
      remainingGrams: f.remainingGrams ?? 0,
    })
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    await saveSpool({
      ...parsed.data,
      id: spool?.id,
      brand: f.brand.trim(),
      emptySpoolWeight: f.emptySpoolWeight,
      purchaseDate: f.purchaseDate || null,
      supplier: f.supplier.trim(),
      note: f.note.trim(),
    })
    toast(spool ? 'Makara güncellendi' : 'Makara eklendi', { tone: 'success' })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={spool ? 'Makarayı düzenle' : 'Makara ekle'}
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={() => void submit()}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tür" htmlFor="sp-type" error={errors.filamentTypeId}>
          <Select
            id="sp-type"
            value={f.filamentTypeId}
            onChange={(id) => {
              const t = types.find((x) => x.id === id)
              set({ filamentTypeId: id, spoolPrice: f.spoolPrice ?? t?.spoolPrice ?? null })
            }}
            options={types.map((t) => ({ value: t.id, label: t.name, icon: <ColorSwatch color={t.color} size={20} /> }))}
          />
        </Field>
        <Field label="Marka" htmlFor="sp-brand">
          <Input id="sp-brand" value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="ör. Bambu Lab, Elas" />
        </Field>
        <Field label="Renk adı" htmlFor="sp-cname" error={errors.colorName}>
          <Input id="sp-cname" value={f.colorName} onChange={(e) => set({ colorName: e.target.value })} placeholder="ör. Mat Kiremit" />
        </Field>
        <Field label="Renk (HEX)" htmlFor="sp-hex" error={errors.color}>
          <div className="flex gap-2">
            <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-ctl border border-line" title="Renk seç">
              <ColorSwatch color={/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : '#888888'} size={28} />
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : '#888888'} onChange={(e) => set({ color: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Renk seçici" />
            </label>
            <Input id="sp-hex" value={f.color} onChange={(e) => set({ color: e.target.value })} placeholder="#FF3D77" maxLength={7} />
          </div>
        </Field>
        <Field label="Makara fiyatı" htmlFor="sp-price">
          <NumberInput id="sp-price" value={f.spoolPrice} onChange={(v) => set({ spoolPrice: v })} unit="₺" step={25} />
        </Field>
        <Field label="Makara gramı" htmlFor="sp-grams" error={errors.spoolGrams}>
          <NumberInput id="sp-grams" value={f.spoolGrams} onChange={(v) => set({ spoolGrams: v })} parse={parseGram} unit="g" step={50} />
        </Field>
        <Field label="Kalan" htmlFor="sp-rem">
          <NumberInput id="sp-rem" value={f.remainingGrams} onChange={(v) => set({ remainingGrams: v })} parse={parseGram} unit="g" step={10} />
        </Field>
        <Field label="Boş makara ağırlığı" htmlFor="sp-empty" info="Tartarak güncelleme için. Bambu Lab plastik makara ~250 g, karton makara ~150 g civarı; kendi makaranı tartmak en doğrusu.">
          <NumberInput id="sp-empty" value={f.emptySpoolWeight} onChange={(v) => set({ emptySpoolWeight: v })} parse={parseGram} unit="g" step={5} placeholder="ör. 250" />
        </Field>
        <Field label="Alış tarihi" htmlFor="sp-date">
          <Input id="sp-date" type="date" value={f.purchaseDate} onChange={(e) => set({ purchaseDate: e.target.value })} />
        </Field>
        <Field label="Tedarikçi" htmlFor="sp-sup">
          <Input id="sp-sup" value={f.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder="ör. Bambu Store, Trendyol" />
        </Field>
        <Field label="Not" htmlFor="sp-note" className="sm:col-span-2">
          <Textarea id="sp-note" value={f.note} onChange={(e) => set({ note: e.target.value })} className="min-h-16" placeholder="ör. Kurutuldu 12.10" />
        </Field>
      </div>
    </Dialog>
  )
}

/* ───────────── Tartarak güncelle ───────────── */

function WeighDialog({ spool, onOpenChange }: { spool: Spool | null; onOpenChange: (o: boolean) => void }) {
  const [total, setTotal] = useState<number | null>(null)
  const [empty, setEmpty] = useState<number | null>(null)
  useEffect(() => {
    setTotal(null)
    setEmpty(spool?.emptySpoolWeight ?? null)
  }, [spool])
  const remaining = total !== null && empty !== null ? remainingFromWeight(total, empty) : null

  async function save() {
    if (!spool || remaining === null) return
    await updateSpool(spool.id, { remainingGrams: remaining, emptySpoolWeight: empty })
    toast(`Kalan ${formatGram(remaining)} olarak güncellendi`, { tone: 'success' })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={!!spool}
      onOpenChange={onOpenChange}
      title="Makara tartarak güncelle"
      description="Makarayı filamentiyle birlikte tart; boş makara ağırlığı düşülür."
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={remaining === null}>
            Kalanı güncelle
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Tartılan toplam ağırlık" htmlFor="w-total">
          <NumberInput id="w-total" value={total} onChange={setTotal} parse={parseGram} unit="g" autoFocus placeholder="ör. 1.050" />
        </Field>
        <Field label="Boş makara ağırlığı" htmlFor="w-empty" hint={spool?.emptySpoolWeight ? 'Kayıtlı değer' : 'İlk kez giriyorsan kaydedilir'}>
          <NumberInput id="w-empty" value={empty} onChange={setEmpty} parse={parseGram} unit="g" placeholder="ör. 250" />
        </Field>
        <div className="inset-surface flex items-center justify-between rounded-[14px] px-4 py-3">
          <span className="text-sm text-fg-2">Kalan filament</span>
          <span className="tnum text-lg font-semibold">{remaining === null ? '—' : formatGram(remaining)}</span>
        </div>
      </div>
    </Dialog>
  )
}

/* ───────────── Makara listesi ───────────── */

function SpoolCard({ s, type, lowThreshold, onEdit, onWeigh }: { s: Spool; type?: FilamentType; lowThreshold: number; onEdit: () => void; onWeigh: () => void }) {
  const low = isLowStock(s.remainingGrams, lowThreshold)
  const ratio = s.spoolGrams > 0 ? s.remainingGrams / s.spoolGrams : 0
  async function remove() {
    const removed = await deleteSpool(s.id)
    if (removed) toast(`${s.colorName} makarası silindi`, { action: { label: 'Geri al', onClick: () => void restoreSpool(removed) } })
  }
  return (
    <li className="glass flex min-w-0 flex-col p-4">
      <div className="flex min-w-0 items-start gap-3">
        <ColorSwatch color={s.color} size={44} title={s.colorName} className="text-fg-3" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">{s.colorName}</span>
            {low && (
              <Badge tone="danger" size="xs">
                düşük stok
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-fg-3">
            {[type?.name ?? 'Silinmiş tür', s.brand].filter(Boolean).join(' · ')} · {s.color.toUpperCase()}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="tnum mb-1.5 flex justify-between text-xs">
          <span className="font-medium text-fg">{formatGram(s.remainingGrams)} kaldı</span>
          <span className="text-fg-3">/ {formatGram(s.spoolGrams)}</span>
        </div>
        <ProgressBar value={ratio} color={s.color} label={`${s.colorName} kalan`} />
      </div>
      <div className="tnum mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-3">
        <span>{formatTL(gramPrice(s.spoolPrice, s.spoolGrams) * 1000, { compactDecimals: true })}/kg</span>
        <span>değer {formatTL(gramPrice(s.spoolPrice, s.spoolGrams) * s.remainingGrams)}</span>
        {s.purchaseDate && <span>{formatDate(s.purchaseDate)}</span>}
        {s.supplier && <span className="truncate">{s.supplier}</span>}
      </div>
      {s.note && <p className="mt-2 line-clamp-2 text-xs text-fg-2">{s.note}</p>}
      <div className="mt-3 flex gap-1 border-t border-line pt-2">
        <Button size="sm" variant="ghost" onClick={onWeigh}>
          <Scale />
          Tartarak güncelle
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" aria-label={`${s.colorName} düzenle`} onClick={onEdit}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`${s.colorName} sil`} onClick={() => void remove()}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

export function SpoolsSection() {
  const settings = useSettings()
  const spools = useLiveQuery(listSpools, [])
  const types = useLiveQuery(listFilamentTypes, [], [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Spool | null>(null)
  const [weighing, setWeighing] = useState<Spool | null>(null)

  if (!spools)
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-card" />
        ))}
      </div>
    )
  const add = () => {
    setEditing(null)
    setOpen(true)
  }
  const totalGrams = spools.reduce((s, x) => s + x.remainingGrams, 0)
  const value = spools.reduce((s, x) => s + gramPrice(x.spoolPrice, x.spoolGrams) * x.remainingGrams, 0)
  const lowCount = spools.filter((s) => isLowStock(s.remainingGrams, settings.lowStockGrams)).length
  const averages = types
    .map((t) => ({ t, list: spools.filter((s) => s.filamentTypeId === t.id) }))
    .filter((x) => x.list.length > 1)
    .map((x) => ({ ...x, avg: weightedAverageGramPrice(x.list) }))

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-2">Düşük stok eşiği: {formatGram(settings.lowStockGrams)} (Ayarlar’dan değişir)</p>
        <Button variant="primary" onClick={add}>
          <Plus />
          Makara ekle
        </Button>
      </div>

      {spools.length === 0 ? (
        <GlassCard padded={false}>
          <EmptyState
            icon={<Disc3 />}
            title="Stokta makara yok"
            description="Makaralarını ekle; kalan gramı renkli çubukla görürsün, düşük stokta rozet çıkar. Hesapla’da makarayı doğrudan seçebilirsin."
            action={
              <Button variant="primary" onClick={add}>
                <Plus />
                İlk makarayı ekle
              </Button>
            }
          />
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Makara" value={spools.length} />
            <StatCard label="Toplam kalan" value={formatGram(totalGrams)} />
            <StatCard label="Stok değeri" value={formatTL(value)} />
            <StatCard label="Düşük stok" value={lowCount} tone={lowCount ? 'danger' : 'default'} />
          </div>
          {averages.length > 0 && (
            <div className="inset-surface rounded-[14px] px-4 py-3 text-xs text-fg-2">
              <span className="font-medium text-fg">Ağırlıklı ortalama gram fiyatı</span> (kalan grama göre; Hesapla’da “stok ortalaması” olarak seçilebilir):{' '}
              {averages.map((a) => `${a.t.name} ${a.avg === null ? '—' : formatTL(a.avg * 1000, { compactDecimals: true }) + '/kg'} (${a.list.length} makara)`).join(' · ')}
            </div>
          )}
          <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {spools.map((s) => (
              <SpoolCard
                key={s.id}
                s={s}
                type={types.find((t) => t.id === s.filamentTypeId)}
                lowThreshold={settings.lowStockGrams}
                onEdit={() => {
                  setEditing(s)
                  setOpen(true)
                }}
                onWeigh={() => setWeighing(s)}
              />
            ))}
          </ul>
        </>
      )}
      <SpoolDialog open={open} onOpenChange={setOpen} spool={editing} types={types} />
      <WeighDialog spool={weighing} onOpenChange={(o) => !o && setWeighing(null)} />
    </div>
  )
}
