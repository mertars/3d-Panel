import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { BrandSection, BulkTiersSection, CatalogLinksSection, OrdersSettingsSection, StockSection } from '@/features/settings/BusinessSettings'
import { AppearanceSection, CostSettingsSection, PricingSettingsSection, TaxFormatSection } from '@/features/settings/GeneralSettings'
import { DataSection } from '@/features/settings/DataSection'

export default function SettingsPage() {
  const { hash } = useLocation()
  // /ayarlar#veri gibi bağlantılarda ilgili bölüme kaydır
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => window.clearTimeout(t)
  }, [hash])
  return (
    <div className="@container mx-auto flex max-w-4xl min-w-0 flex-col gap-4 lg:gap-5">
      <PricingSettingsSection />
      <CostSettingsSection />
      <TaxFormatSection />
      <BulkTiersSection />
      <StockSection />
      <OrdersSettingsSection />
      <BrandSection />
      <CatalogLinksSection />
      <AppearanceSection />
      <DataSection />
    </div>
  )
}
