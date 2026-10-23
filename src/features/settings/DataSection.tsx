import { Database, Download, FileSpreadsheet, RotateCcw, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, ConfirmDialog, Dialog, Field, Input, Section, Segmented } from '@/components/ui'
import { resetAllData } from '@/db'
import { useCatalog } from '@/features/calculator/useCalculation'
import { createBackup, parseBackup, restoreBackup, summarize, type Backup } from '@/features/data/backup'
import { ordersCsv, productsCsv } from '@/features/data/csvExport'
import { seedDemoData } from '@/features/data/demo'
import { downloadBlob, isoDay } from '@/lib/download'
import { formatDate } from '@/lib/format'
import { useSettings, useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toast'
import { useUI } from '@/store/ui'

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

/** "12 gün önce" */
export function relativeDays(ms: number, now = Date.now()): string {
  const days = Math.round((ms - now) / 86400000)
  if (Math.abs(days) < 1) {
    const hours = Math.round((ms - now) / 3600000)
    return Math.abs(hours) < 1 ? 'az önce' : rtf.format(hours, 'hour')
  }
  return rtf.format(days, 'day')
}

export function DataSection() {
  const settings = useSettings()
  const update = useSettingsStore((s) => s.update)
  const reload = useSettingsStore((s) => s.load)
  const setWizardOpen = useUI((s) => s.setWizardOpen)
  const catalog = useCatalog()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [busy, setBusy] = useState(false)
  const [demoConfirm, setDemoConfirm] = useState(false)
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0)
  const [wipeText, setWipeText] = useState('')

  async function exportJson() {
    setBusy(true)
    try {
      const b = await createBackup()
      downloadBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `katman-yedek-${isoDay()}`, 'json')
      await update({ lastBackupAt: Date.now() })
      toast('Yedek indirildi', { tone: 'success' })
    } finally {
      setBusy(false)
    }
  }

  async function pickFile(file?: File) {
    if (!file) return
    try {
      setPendingImport(parseBackup(await file.text()))
      setMode('merge')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Dosya okunamadı', { tone: 'danger' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function confirmImport() {
    if (!pendingImport) return
    setBusy(true)
    try {
      await restoreBackup(pendingImport, mode)
      await reload()
      toast(mode === 'replace' ? 'Yedek yüklendi — mevcut veri değiştirildi' : 'Yedek mevcut veriyle birleştirildi', { tone: 'success' })
      setPendingImport(null)
    } catch {
      toast('Yedek yüklenemedi', { tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  async function csv(kind: 'products' | 'orders') {
    const text = kind === 'products' ? await productsCsv(catalog, settings) : await ordersCsv(settings)
    downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), `katman-${kind === 'products' ? 'urunler' : 'siparisler'}-${isoDay()}`, 'csv')
  }

  const lastBackup = settings.lastBackupAt
  const stale = !lastBackup || Date.now() - lastBackup > 14 * 86400000

  return (
    <Section title="Veri" description="Tüm veriler yalnızca bu cihazda (IndexedDB) saklanır — düzenli yedek al." icon={<Database className="size-4" />}>
      <p className={`mb-3 text-sm ${stale ? 'text-warning' : 'text-fg-2'}`}>
        {lastBackup ? `Son yedek: ${relativeDays(lastBackup)} (${formatDate(lastBackup)})` : 'Henüz yedek alınmadı'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void exportJson()} disabled={busy}>
          <Download />
          Yedek indir (JSON)
        </Button>
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload />
          Yedekten geri yükle
        </Button>
        <Button onClick={() => void csv('products')}>
          <FileSpreadsheet />
          Ürünler CSV
        </Button>
        <Button onClick={() => void csv('orders')}>
          <FileSpreadsheet />
          Siparişler CSV
        </Button>
      </div>
      <p className="mt-2 text-xs text-fg-3">CSV dosyaları Excel’de Türkçe karakterler bozulmadan açılır (UTF-8 BOM, “;” ayırıcı).</p>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pickFile(e.target.files?.[0])} />

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button onClick={() => setDemoConfirm(true)}>
          <Wand2 />
          Örnek verilerle doldur
        </Button>
        <Button onClick={() => setWizardOpen(true)}>
          <Sparkles />
          Kurulum sihirbazını aç
        </Button>
        <Button variant="danger" onClick={() => setWipeStep(1)}>
          <Trash2 />
          Tüm veriyi sil
        </Button>
      </div>

      <Dialog
        open={!!pendingImport}
        onOpenChange={(o) => !o && setPendingImport(null)}
        title="Yedekten geri yükle"
        description={pendingImport ? `Yedek tarihi: ${formatDate(pendingImport.exportedAt)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingImport(null)}>
              Vazgeç
            </Button>
            <Button variant={mode === 'replace' ? 'danger' : 'primary'} onClick={() => void confirmImport()} disabled={busy}>
              {mode === 'replace' ? 'Üzerine yaz' : 'Birleştir'}
            </Button>
          </>
        }
      >
        {pendingImport && (
          <div className="grid gap-4">
            <ul className="inset-surface grid grid-cols-2 gap-x-4 gap-y-1 rounded-[14px] p-4 text-sm">
              {summarize(pendingImport).map((l) => (
                <li key={l.table} className="tnum flex justify-between gap-2">
                  <span className="text-fg-2">{l.label}</span>
                  <b>{l.count}</b>
                </li>
              ))}
            </ul>
            <Segmented<'merge' | 'replace'>
              aria-label="Geri yükleme yöntemi"
              className="w-full"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'merge', label: 'Birleştir' },
                { value: 'replace', label: 'Üzerine yaz' },
              ]}
            />
            <p className="text-sm text-fg-2">
              {mode === 'merge'
                ? 'Yedekteki kayıtlar eklenir; aynı kayıt varsa yedekteki haliyle değişir. Mevcut ayarların korunur.'
                : 'Şu anki TÜM veri silinir ve yedek aynen yüklenir (ayarlar dahil). Geri alınamaz.'}
            </p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={demoConfirm}
        onOpenChange={setDemoConfirm}
        tone="primary"
        title="Örnek verilerle doldur?"
        description="12 ürün, 20 sipariş ve 6 makara eklenir (“örnek” etiketiyle). Mevcut verin silinmez. Denedikten sonra “Tüm veriyi sil” ile temizleyebilirsin."
        confirmLabel="Doldur"
        onConfirm={async () => {
          const r = await seedDemoData()
          toast(`${r.products} ürün, ${r.orders} sipariş, ${r.spools} makara eklendi`, { tone: 'success' })
        }}
      />

      <ConfirmDialog
        open={wipeStep === 1}
        onOpenChange={(o) => !o && setWipeStep(0)}
        title="Tüm veri silinsin mi?"
        description="Ürünler, siparişler, teklifler, makaralar, yazıcılar, fiyat geçmişi ve ayarlar kalıcı olarak silinir. Önce yedek almanı öneririz."
        confirmLabel="Devam"
        onConfirm={() => {
          setWipeText('')
          window.setTimeout(() => setWipeStep(2), 0)
        }}
      />
      <Dialog
        open={wipeStep === 2}
        onOpenChange={(o) => !o && setWipeStep(0)}
        title="Son onay"
        description="Silmek için aşağıya SİL yaz."
        className="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWipeStep(0)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              disabled={wipeText.trim().toLocaleUpperCase('tr-TR') !== 'SİL'}
              onClick={async () => {
                await resetAllData()
                localStorage.removeItem('katman-ui')
                sessionStorage.clear()
                window.location.assign('/')
              }}
            >
              <RotateCcw />
              Kalıcı olarak sil
            </Button>
          </>
        }
      >
        <Field label="Onay" htmlFor="wipe-confirm">
          <Input id="wipe-confirm" value={wipeText} onChange={(e) => setWipeText(e.target.value)} placeholder="SİL" autoComplete="off" autoFocus />
        </Field>
      </Dialog>
    </Section>
  )
}
