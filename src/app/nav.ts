import {
  Calculator,
  ClipboardList,
  Disc3,
  FileText,
  LayoutDashboard,
  Package,
  Printer,
  Settings,
  Store,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Mobil alt sekme çubuğunda doğrudan görünür mü */
  tab?: boolean
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, tab: true },
  { to: '/hesapla', label: 'Hesapla', icon: Calculator, tab: true },
  { to: '/urunler', label: 'Ürünler', icon: Package, tab: true },
  { to: '/siparisler', label: 'Siparişler', icon: ClipboardList, tab: true },
  { to: '/teklifler', label: 'Teklifler', icon: FileText },
  { to: '/filamentler', label: 'Filamentler', icon: Disc3 },
  { to: '/yazicilar', label: 'Yazıcılar', icon: Printer },
  { to: '/kanallar', label: 'Kanallar', icon: Store },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

export function navTitle(pathname: string): string {
  const match = NAV.filter((n) => n.to !== '/' && pathname.startsWith(n.to))[0]
  return match?.label ?? (pathname === '/' ? 'Panel' : 'Katman')
}
