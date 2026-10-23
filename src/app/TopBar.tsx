import { Plus, Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui'
import { useUI } from '@/store/ui'
import { LogoMark } from './Logo'
import { navTitle } from './nav'
import { useNewProduct } from './useNewProduct'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function TopBar() {
  const { pathname } = useLocation()
  const openPalette = useUI((s) => s.setPaletteOpen)
  const newProduct = useNewProduct()
  const title = navTitle(pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <LogoMark className="lg:hidden" />
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-fg">{title}</h1>

        <button
          type="button"
          onClick={() => openPalette(true)}
          className="hidden h-10 w-64 items-center gap-2 rounded-ctl border border-line bg-field px-3 text-sm text-fg-3 transition-colors hover:border-line-strong hover:text-fg-2 md:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Ara veya komut…</span>
          <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-sans text-[11px] text-fg-3">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ara" onClick={() => openPalette(true)}>
          <Search />
        </Button>

        <Button variant="primary" onClick={newProduct} className="hidden sm:inline-flex">
          <Plus />
          Yeni ürün
        </Button>
        <Button variant="primary" size="icon" onClick={newProduct} aria-label="Yeni ürün" className="sm:hidden">
          <Plus />
        </Button>
      </div>
    </header>
  )
}
