import { useLiveQuery } from 'dexie-react-hooks'
import { ClipboardList, Disc3, FileText, LayoutDashboard, Package, Printer, Store } from 'lucide-react'
import { Badge } from '@/components/ui'
import { countProducts } from '@/db'
import { useUI } from '@/store/ui'
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

export function ProductsPage() {
  const count = useLiveQuery(countProducts, [], 0)
  const openPalette = useUI((s) => s.setPaletteOpen)
  return (
    <ComingSoon
      icon={Package}
      part="Parça 2"
      title="Ürün listesi yakında"
      description={
        count > 0
          ? `Kaydettiğin ${count} ürün güvende. Liste ekranı gelene kadar ⌘K / Ctrl+K ile arayıp Hesapla’da açabilirsin.`
          : 'Hesapla ekranında “Kaydet” dediğin ürünler burada listelenecek: arama, filtre, fotoğraf ve fiyat geçmişiyle.'
      }
      extra={
        count > 0 ? (
          <button
            type="button"
            onClick={() => openPalette(true)}
            className="inline-flex h-11 items-center gap-2 rounded-ctl border border-line bg-surface-strong px-4 text-sm font-medium text-fg hover:border-line-strong"
          >
            Ürün ara <Badge size="xs">{count}</Badge>
          </button>
        ) : undefined
      }
    />
  )
}

export function OrdersPage() {
  return (
    <ComingSoon
      icon={ClipboardList}
      part="Parça 2"
      title="Siparişler yakında"
      description="Siparişleri kanal, durum ve teslim tarihine göre takip edeceğin ekran. Her sipariş gerçek kanal kesintisiyle kâr hesabı yapacak."
    />
  )
}

export function QuotesPage() {
  return (
    <ComingSoon
      icon={FileText}
      part="Parça 2"
      title="Teklif kartları yakında"
      description="Müşteriye gönderebileceğin, fotoğraflı ve fiyatlı şık teklif kartları burada oluşturulacak."
    />
  )
}

export function FilamentsPage() {
  return (
    <ComingSoon
      icon={Disc3}
      part="Parça 2"
      title="Filament stoğu yakında"
      description="Makaralarını renk, marka ve kalan gramla takip edeceksin. Şimdilik filament türlerinin fiyatlarını Ayarlar’dan düzenleyebilirsin."
    />
  )
}

export function PrintersPage() {
  return (
    <ComingSoon
      icon={Printer}
      part="Parça 2"
      title="Yazıcı yönetimi yakında"
      description="Yazıcı başına çalışma saati, bakım ve doluluk takibi burada olacak. Yazıcı ekleme ve düzenleme şimdilik Ayarlar’da."
    />
  )
}

export function ChannelsPage() {
  return (
    <ComingSoon
      icon={Store}
      part="Parça 2"
      title="Kanal yönetimi yakında"
      description="Shopier, Trendyol, Etsy ve diğer kanalların oranlarını düzenleyip yeni kanal ekleyebileceksin. Varsayılan kanallar şimdiden Hesapla ekranındaki kanal fiyatlarında kullanılıyor."
    />
  )
}
