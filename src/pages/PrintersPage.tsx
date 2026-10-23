import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Printer as PrinterIcon, Star, Trash2, Wrench, X } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Dialog, EmptyState, Field, GlassCard, Input, Menu, NumberInput, ProgressBar, ProgressRing, Skeleton } from '@/components/ui'
import {
  addMaintenance,
  deletePrinter,
  listFailures,
  listOrders,
  listPrinters,
  presetInfo,
  removeMaintenance,
  restorePrinter,
  savePrinter,
  type Failure,
  type Order,
  type Printer,
} from '@/db'
import { PrinterDialog } from '@/features/printers/PrinterDialog'
import { printerUsage } from '@/features/printers/usage'
import { formatDate, formatNumber, formatPercent, formatTL } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

const today = () => new Date().toISOString().slice(0, 10)

function MaintenanceDialog({ printer, onOpenChange }: { printer: Printer | null; onOpenChange: (o: boolean) => void }) {
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [cost, setCost] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!printer) return
    if (!note.trim()) {
      setError('Ne yapıldığını yaz (ör. Nozzle değişimi)')
      return
    }
    await addMaintenance(printer.id, { date, note: note.trim(), cost })
    toast('Bakım kaydı eklendi', { tone: 'success' })
    setNote('')
    setCost(null)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={!!printer}
      onOpenChange={onOpenChange}
      title="Bakım kaydı ekle"
      description={printer?.name}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            Ekle
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Tarih" htmlFor="m-date">
          <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Yapılan iş" htmlFor="m-note" error={error}>
          <Input id="m-note" list="m-note-list" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ör. 0,4 nozzle değişimi" autoFocus />
          <datalist id="m-note-list">
            {['Nozzle değişimi', 'PTFE tüp değişimi', 'Plaka değişimi', 'Rayların yağlanması', 'Karbon çubuk temizliği', 'Hotend temizliği', 'Kayış gerginliği ayarı'].map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </Field>
        <Field label="Masraf (isteğe bağlı)" htmlFor="m-cost">
          <NumberInput id="m-cost" value={cost} onChange={setCost} unit="₺" step={50} placeholder="0" />
        </Field>
      </div>
    </Dialog>
  )
}

function PrinterCard({ p, orders, failures, onEdit, onMaintain }: { p: Printer; orders: Order[]; failures: Failure[]; onEdit: () => void; onMaintain: () => void }) {
  const settings = useSettings()
  const u = printerUsage(p, orders, failures)
  const hourlyCost = u.hourlyDepreciation + p.maintenancePerHour + (p.watts / 1000) * settings.kwhPrice
  const maintenanceTotal = p.maintenanceLog.reduce((s, e) => s + (e.cost ?? 0), 0)

  async function remove() {
    const removed = await deletePrinter(p.id)
    if (removed) toast(`“${p.name}” silindi`, { action: { label: 'Geri al', onClick: () => void restorePrinter(removed) } })
  }

  return (
    <article className="glass flex min-w-0 flex-col p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="inset-surface flex size-11 shrink-0 items-center justify-center rounded-xl text-brand-2">
          <PrinterIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[15px] font-semibold">{p.name}</h2>
            {p.isDefault && (
              <Badge tone="brand" size="xs">
                <Star className="size-2.5" /> varsayılan
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-fg-3">
            {presetInfo(p.preset).name} · {p.watts} W · {p.price ? formatTL(p.price, { compactDecimals: true }) : 'fiyat girilmedi'}
          </p>
        </div>
        <Menu
          label={`${p.name} eylemleri`}
          items={[
            { label: 'Düzenle', icon: Pencil, onSelect: onEdit },
            { label: 'Varsayılan yap', icon: Star, disabled: p.isDefault, onSelect: () => void savePrinter({ ...p, isDefault: true }) },
            { label: 'Sil', icon: Trash2, danger: true, onSelect: () => void remove() },
          ]}
        />
      </div>

      <div className="mt-5 flex min-w-0 items-center gap-5">
        <ProgressRing value={u.payback} size={104} label={`Yazıcı kendini ${formatPercent(u.payback * 100, 0)} ödedi`}>
          <span className="tnum text-xl font-bold">{formatPercent(u.payback * 100, 0)}</span>
          <span className="text-[10px] text-fg-3">ödedi</span>
        </ProgressRing>
        <dl className="tnum grid min-w-0 flex-1 grid-cols-1 gap-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-fg-3">Toplanan amortisman</dt>
            <dd className="font-medium">{formatTL(u.collected)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-fg-3">Tamamlanan sipariş</dt>
            <dd className="font-medium">{u.completedOrders}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-fg-3">Saatlik makine maliyeti</dt>
            <dd className="font-medium">{formatTL(hourlyCost)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-fg-3">Amortisman / saat</dt>
            <dd className="font-medium">{formatTL(u.hourlyDepreciation)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        <div className="tnum mb-1.5 flex justify-between text-xs">
          <span className="text-fg-2">
            Toplam basılan <b className="text-fg">{formatNumber(u.totalHours, 1)} sa</b>
          </span>
          <span className="text-fg-3">ömür {formatNumber(p.lifeHours)} sa</span>
        </div>
        <ProgressBar value={u.lifeUsed} label="Ömür kullanımı" />
        <p className="mt-1.5 text-[11px] text-fg-3">
          Siparişlerden {formatNumber(u.orderHours, 1)} sa{u.failureHours ? ` + fire ${formatNumber(u.failureHours, 1)} sa` : ''}
          {p.startHours ? ` + önceki kullanım ${formatNumber(p.startHours)} sa` : ''}
        </p>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Wrench className="size-3.5" /> Bakım kaydı
            {maintenanceTotal > 0 && <span className="tnum font-normal text-fg-3">· {formatTL(maintenanceTotal)}</span>}
          </h3>
          <Button size="sm" variant="ghost" onClick={onMaintain}>
            <Plus />
            Ekle
          </Button>
        </div>
        {p.maintenanceLog.length === 0 ? (
          <p className="text-xs text-fg-3">Nozzle, PTFE, plaka değişimi gibi işleri tarihiyle kaydet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {p.maintenanceLog.slice(0, 6).map((e) => (
              <li key={e.id} className="flex min-w-0 items-center gap-2 text-xs">
                <span className="tnum w-24 shrink-0 text-fg-3">{formatDate(e.date)}</span>
                <span className="min-w-0 flex-1 truncate text-fg-2">{e.note}</span>
                {e.cost ? <span className="tnum shrink-0 text-fg-3">{formatTL(e.cost, { compactDecimals: true })}</span> : null}
                <button
                  type="button"
                  aria-label={`${e.note} kaydını sil`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-3 hover:bg-surface hover:text-danger"
                  onClick={async () => {
                    const removed = await removeMaintenance(p.id, e.id)
                    if (removed) toast('Bakım kaydı silindi', { action: { label: 'Geri al', onClick: () => void addMaintenance(p.id, removed) } })
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
            {p.maintenanceLog.length > 6 && <li className="text-xs text-fg-3">+{p.maintenanceLog.length - 6} kayıt daha</li>}
          </ul>
        )}
      </div>
    </article>
  )
}

export default function PrintersPage() {
  const printers = useLiveQuery(listPrinters, [])
  const orders = useLiveQuery(listOrders, [], [])
  const failures = useLiveQuery(listFailures, [], [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Printer | null>(null)
  const [maintaining, setMaintaining] = useState<Printer | null>(null)

  const add = () => {
    setEditing(null)
    setOpen(true)
  }

  if (!printers) return <Skeleton className="h-80 rounded-card" />

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-fg-2">
          Basılan saat ve amortisman payı, stoğu düşülen siparişlerden (Ayarlar’a göre Baskıda veya Teslim edildi) ve fire kayıtlarından otomatik hesaplanır.
        </p>
        <Button variant="primary" onClick={add}>
          <Plus />
          Yazıcı ekle
        </Button>
      </div>
      {printers.length === 0 ? (
        <GlassCard padded={false}>
          <EmptyState
            icon={<PrinterIcon />}
            title="Henüz yazıcı yok"
            description="Amortisman, elektrik ve bakım maliyeti için yazıcını ekle."
            action={
              <Button variant="primary" onClick={add}>
                <Plus />
                Yazıcı ekle
              </Button>
            }
          />
        </GlassCard>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {printers.map((p) => (
            <PrinterCard
              key={p.id}
              p={p}
              orders={orders}
              failures={failures}
              onEdit={() => {
                setEditing(p)
                setOpen(true)
              }}
              onMaintain={() => setMaintaining(p)}
            />
          ))}
        </div>
      )}
      <PrinterDialog open={open} onOpenChange={setOpen} printer={editing} />
      <MaintenanceDialog printer={maintaining} onOpenChange={(o) => !o && setMaintaining(null)} />
    </div>
  )
}
