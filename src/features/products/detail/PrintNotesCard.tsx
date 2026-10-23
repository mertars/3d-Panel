import { NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BlurInput, Field, NumberInput, Section, Select, Textarea } from '@/components/ui'
import { updateProduct, type PrintNotes, type Product } from '@/db'

const NOZZLES = ['0.2', '0.4', '0.6', '0.8']
const SUPPORTS = ['Yok', 'Ağaç (tree)', 'Normal', 'Sadece plakaya']
const PLATES = ['Textured PEI', 'Smooth PEI', 'Cool Plate', 'Engineering Plate', 'High Temp Plate']

/** Baskı notları: katman yüksekliği, dolgu, nozzle, plaka, destek, serbest not */
export function PrintNotesCard({ product }: { product: Product }) {
  const n = product.printNotes
  const save = (patch: Partial<PrintNotes>) => void updateProduct(product.id, { printNotes: { ...n, ...patch } })
  const [notes, setNotes] = useState(n.notes)
  useEffect(() => setNotes(n.notes), [n.notes])

  return (
    <Section title="Baskı notları" description="Aynı ürünü tekrar basarken ayarları hatırla." icon={<NotebookPen className="size-4" />}>
      <div className="grid gap-4 @md:grid-cols-2 @2xl:grid-cols-3">
        <Field label="Katman yüksekliği" htmlFor="pn-layer">
          <NumberInput id="pn-layer" value={n.layerHeight} onChange={(v) => save({ layerHeight: v })} unit="mm" step={0.04} max={1} placeholder="0,2" />
        </Field>
        <Field label="Dolgu" htmlFor="pn-infill">
          <NumberInput id="pn-infill" value={n.infillPercent} onChange={(v) => save({ infillPercent: v })} unit="%" step={5} max={100} placeholder="15" />
        </Field>
        <Field label="Nozzle" htmlFor="pn-nozzle">
          <Select
            id="pn-nozzle"
            value={n.nozzle}
            onChange={(v) => save({ nozzle: v })}
            placeholder="Seç"
            options={NOZZLES.map((x) => ({ value: x, label: `${x.replace('.', ',')} mm` }))}
          />
        </Field>
        <Field label="Plaka tipi" htmlFor="pn-plate">
          <BlurInput id="pn-plate" list="pn-plate-list" value={n.plateType} onCommit={(v) => save({ plateType: v })} placeholder="ör. Textured PEI" />
          <datalist id="pn-plate-list">
            {PLATES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Destek" htmlFor="pn-support">
          <Select id="pn-support" value={n.supports} onChange={(v) => save({ supports: v })} placeholder="Seç" options={SUPPORTS.map((x) => ({ value: x, label: x }))} />
        </Field>
        <Field label="Not" htmlFor="pn-notes" className="@md:col-span-2 @2xl:col-span-3">
          <Textarea
            id="pn-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== n.notes && save({ notes })}
            placeholder="ör. Kenar (brim) 5 mm, 2. katmanda renk değişimi, ütüleme açık…"
          />
        </Field>
      </div>
    </Section>
  )
}
