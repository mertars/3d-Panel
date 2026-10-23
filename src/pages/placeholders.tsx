import { ClipboardList, LayoutDashboard } from 'lucide-react'
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

export function OrdersPage() {
  return (
    <ComingSoon
      icon={ClipboardList}
      part="Parça 3"
      title="Siparişler yakında"
      description="Siparişleri kanal, durum ve teslim tarihine göre takip edeceğin ekran. Kabul edilen teklifler tek tıkla siparişe dönüşecek; yazıcı saatleri ve amortisman payı siparişlerden otomatik hesaplanacak."
    />
  )
}
