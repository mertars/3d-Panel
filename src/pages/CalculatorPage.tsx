import { Gauge, Plus, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLayout } from '@/app/AppShell'
import { freshDraft, useNewProduct } from '@/app/useNewProduct'
import { Badge, Button, GlassCard, Segmented, Sheet, Skeleton } from '@/components/ui'
import { getProduct } from '@/db'
import { BasicsSection, FilamentSection, LaborSection, PrintSection, QuickSection } from '@/features/calculator/FormSections'
import { MiniPriceBar } from '@/features/calculator/MiniPriceBar'
import { PricePanel } from '@/features/calculator/PricePanel'
import { saveDraftAsProduct, validateDraft, type ProductErrors } from '@/features/calculator/save'
import { useCalculator } from '@/features/calculator/store'
import { useCalculation, useCatalog } from '@/features/calculator/useCalculation'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import { useUI } from '@/store/ui'

/** Form + fiyat paneli yan yana sığacak en küçük içerik genişliği */
const TWO_COLUMN_MIN = 900

export default function CalculatorPage() {
  const catalog = useCatalog()
  const calc = useCalculation(catalog)
  const settings = useSettings()
  const { contentWidth, bottomBar, keyboardOpen } = useLayout()
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed)
  const mode = useCalculator((s) => s.draft.mode)
  const productId = useCalculator((s) => s.draft.productId)
  const dirty = useCalculator((s) => s.dirty)
  const setDraft = useCalculator((s) => s.set)
  const markSaved = useCalculator((s) => s.markSaved)
  const newProduct = useNewProduct()
  const [errors, setErrors] = useState<ProductErrors>({})
  const [saving, setSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const initialized = useRef(false)

  // Dokunulmamış taslağı güncel varsayılanlarla (ilk filament, varsayılan yazıcı) başlat;
  // kayıtlı bir ürün düzenleniyorsa fotoğrafını geri yükle (sessionStorage'a yazılmaz).
  useEffect(() => {
    if (initialized.current || !catalog.loaded) return
    initialized.current = true
    const { draft, dirty: isDirty } = useCalculator.getState()
    if (!isDirty && !draft.productId) {
      void freshDraft().then((d) => useCalculator.getState().replace(d))
    } else if (draft.productId && !draft.photo) {
      void getProduct(draft.productId).then((p) => {
        if (p?.photo) useCalculator.setState((s) => ({ draft: { ...s.draft, photo: p.photo } }))
      })
    }
  }, [catalog.loaded])

  async function save() {
    const draft = useCalculator.getState().draft
    const errs = validateDraft(draft)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setSheetOpen(false)
      toast(errs.name ?? errs.link ?? 'Formu kontrol et', { tone: 'danger' })
      document.getElementById(errs.name ? 'p-name' : 'p-link')?.focus()
      return
    }
    setSaving(true)
    try {
      const p = await saveDraftAsProduct(draft, calc, settings)
      markSaved(p.id)
      toast(draft.productId ? `“${p.name}” güncellendi` : `“${p.name}” kaydedildi`, { tone: 'success' })
    } catch {
      toast('Kaydedilemedi — tarayıcı depolaması dolu olabilir', { tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const twoColumn = contentWidth >= TWO_COLUMN_MIN

  if (!catalog.loaded) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  const panel = (
    <PricePanel calc={calc} channels={catalog.channels} onSave={save} saving={saving} />
  )

  return (
    <div
      className={twoColumn ? 'grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(340px,400px)] items-start gap-6 2xl:gap-8' : 'min-w-0'}
    >
      <div className="@container flex min-w-0 flex-col gap-4 lg:gap-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Segmented
            aria-label="Hesaplama modu"
            value={mode}
            onChange={(m) => setDraft({ mode: m })}
            options={[
              { value: 'quick', label: 'Hızlı', icon: <Zap /> },
              { value: 'detailed', label: 'Detaylı', icon: <Gauge /> },
            ]}
          />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {productId ? (
              <Badge tone={dirty ? 'warning' : 'success'}>{dirty ? 'Kaydedilmemiş değişiklik' : 'Kayıtlı ürün'}</Badge>
            ) : (
              dirty && <Badge>Taslak</Badge>
            )}
            {(productId || dirty) && (
              <Button size="sm" variant="ghost" onClick={newProduct}>
                <Plus />
                Yeni
              </Button>
            )}
          </div>
        </div>

        <BasicsSection errors={errors} />
        {mode === 'quick' ? (
          <QuickSection />
        ) : (
          <>
            <FilamentSection catalog={catalog} />
            <PrintSection printers={catalog.printers} />
            <LaborSection />
          </>
        )}
      </div>

      {twoColumn ? (
        <aside aria-label="Fiyat paneli" className="sticky top-[88px] min-w-0">
          <GlassCard className="max-h-[calc(100dvh-112px)] overflow-y-auto overscroll-contain p-4 sm:p-5">
            <h2 className="sr-only">Fiyat paneli</h2>
            {panel}
          </GlassCard>
        </aside>
      ) : (
        <>
          <MiniPriceBar
            prices={calc.prices}
            onOpen={() => setSheetOpen(true)}
            aboveTabs={bottomBar}
            hidden={keyboardOpen || sheetOpen}
            sidebarWidth={sidebarCollapsed ? 72 : 248}
          />
          {/* Masaüstünde yüzen çubuk içeriğin sonunu örtmesin */}
          <div className="hidden h-20 lg:block" aria-hidden />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Fiyat paneli">
            {panel}
          </Sheet>
        </>
      )}
    </div>
  )
}
