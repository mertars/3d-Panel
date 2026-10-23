import { Database, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, Section } from '@/components/ui'
import { resetAllData } from '@/db'
import { ChannelsSettingsSection, FilamentTypesSettingsSection, PrintersSettingsSection } from '@/features/settings/CatalogSettings'
import { AppearanceSection, CostSettingsSection, PricingSettingsSection, TaxFormatSection } from '@/features/settings/GeneralSettings'
import { useUI } from '@/store/ui'

function DataSection() {
  const setWizardOpen = useUI((s) => s.setWizardOpen)
  const [confirm, setConfirm] = useState(false)
  return (
    <Section title="Veri" description="Tüm veriler yalnızca bu cihazda (IndexedDB) saklanır." icon={<Database className="size-4" />}>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setWizardOpen(true)}>
          <Sparkles />
          Kurulum sihirbazını aç
        </Button>
        <Button variant="danger" onClick={() => setConfirm(true)}>
          <RotateCcw />
          Tüm verileri sıfırla
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Tüm veriler silinsin mi?"
        description="Ürünler, yazıcılar, ayarlar ve fiyat geçmişi kalıcı olarak silinir ve varsayılanlar geri yüklenir. Bu işlem geri alınamaz."
        confirmLabel="Evet, sıfırla"
        onConfirm={async () => {
          await resetAllData()
          localStorage.removeItem('katman-ui')
          sessionStorage.clear()
          window.location.assign('/')
        }}
      />
    </Section>
  )
}

export default function SettingsPage() {
  return (
    <div className="@container mx-auto flex max-w-4xl min-w-0 flex-col gap-4 lg:gap-5">
      <PricingSettingsSection />
      <CostSettingsSection />
      <TaxFormatSection />
      <PrintersSettingsSection />
      <FilamentTypesSettingsSection />
      <ChannelsSettingsSection />
      <AppearanceSection />
      <DataSection />
    </div>
  )
}
