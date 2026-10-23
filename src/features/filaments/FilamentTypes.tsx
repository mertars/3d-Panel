import { useLiveQuery } from 'dexie-react-hooks'
import { Disc3, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, ColorSwatch, ConfirmDialog, Input, NumberInput, Section } from '@/components/ui'
import {
  addFilamentType,
  deleteFilamentType,
  listFilamentTypes,
  restoreFilamentType,
  updateFilamentType,
  type FilamentType,
} from '@/db'
import { formatTL } from '@/lib/format'
import { gramPrice } from '@/lib/pricing'
import { toast } from '@/store/toast'

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

export function FilamentTypesSection() {
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
