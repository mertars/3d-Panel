import { LayoutDashboard } from 'lucide-react'
import { ComingSoon } from './ComingSoon'

export function DashboardPage() {
  return (
    <ComingSoon
      icon={LayoutDashboard}
      part="Parça 3"
      title="Kâr panosu hazırlanıyor"
      description="Aylık ciro, kâr, saat başı kâr ve en çok kazandıran ürünler burada olacak. Şimdilik Hesapla ekranından ürünlerini fiyatlayıp kaydedebilirsin."
    />
  )
}
