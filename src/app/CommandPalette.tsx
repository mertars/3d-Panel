import * as RDialog from '@radix-ui/react-dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { CornerDownLeft, FileSignature, ScrollText, Package, PanelLeft, Plus, Search, Sparkles, SunMoon, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { createOrder, listProductNames } from '@/db'
import { cn } from '@/lib/cn'
import { useUI } from '@/store/ui'
import { NAV } from './nav'
import { useNewQuote } from '@/features/quotes/useNewQuote'
import { useNewProduct } from './useNewProduct'

interface Command {
  id: string
  label: string
  group: string
  icon: LucideIcon
  keywords?: string
  run: () => void
}

const norm = (s: string) => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** ⌘K / Ctrl+K komut paleti */
export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setOpen = useUI((s) => s.setPaletteOpen)
  const cycleTheme = useUI((s) => s.cycleTheme)
  const toggleSidebar = useUI((s) => s.toggleSidebar)
  const setWizardOpen = useUI((s) => s.setWizardOpen)
  const navigate = useNavigate()
  const newProduct = useNewProduct()
  const newQuote = useNewQuote()
  const products = useLiveQuery(listProductNames, [], [])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useUI.getState().paletteOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      { id: 'new', label: 'Yeni ürün', group: 'Eylemler', icon: Plus, keywords: 'ekle hesapla', run: newProduct },
      { id: 'quote', label: 'Yeni teklif', group: 'Eylemler', icon: FileSignature, keywords: 'müşteri fiyat', run: () => void newQuote() },
      { id: 'pricelist', label: 'Fiyat listesi oluştur', group: 'Eylemler', icon: ScrollText, keywords: 'instagram hikaye png', run: () => navigate('/fiyat-listesi') },
      { id: 'order', label: 'Yeni sipariş', group: 'Eylemler', icon: Plus, keywords: 'müşteri', run: () => void createOrder().then((o) => navigate(`/siparisler/${o.id}`)) },
      { id: 'theme', label: 'Temayı değiştir', group: 'Eylemler', icon: SunMoon, keywords: 'koyu açık', run: cycleTheme },
      { id: 'sidebar', label: 'Kenar çubuğunu daralt / genişlet', group: 'Eylemler', icon: PanelLeft, run: toggleSidebar },
      { id: 'wizard', label: 'Kurulum sihirbazını aç', group: 'Eylemler', icon: Sparkles, keywords: 'ilk açılış', run: () => setWizardOpen(true) },
    ]
    const pages: Command[] = NAV.map((n) => ({
      id: `nav:${n.to}`,
      label: n.label,
      group: 'Sayfalar',
      icon: n.icon,
      run: () => navigate(n.to),
    }))
    const prods: Command[] = products.map((p) => ({
      id: `p:${p.id}`,
      label: p.name || 'Adsız ürün',
      group: 'Ürünler',
      icon: Package,
      keywords: p.category,
      run: () => navigate(`/urunler/${p.id}`),
    }))
    return [...actions, ...pages, ...prods]
  }, [products, navigate, newProduct, newQuote, cycleTheme, toggleSidebar, setWizardOpen])

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    if (!q) {
      // Boş aramada son 8 ürün yeter
      const recent = commands.filter((c) => c.group === 'Ürünler').slice(0, 8)
      return [...commands.filter((c) => c.group !== 'Ürünler'), ...recent]
    }
    return commands.filter((c) => norm(`${c.label} ${c.keywords ?? ''}`).includes(q))
  }, [commands, query])

  useEffect(() => setActive(0), [query, open])

  function run(c: Command | undefined) {
    if (!c) return
    setOpen(false)
    setQuery('')
    c.run()
  }

  const groups = Array.from(new Set(filtered.map((c) => c.group)))

  return (
    <RDialog.Root open={open} onOpenChange={setOpen}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-[6px]" />
        <RDialog.Content
          className="solid-surface fixed top-[max(16px,10dvh)] left-1/2 z-[61] flex max-h-[min(560px,80dvh)] w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-card data-[state=open]:animate-[dialog-in_160ms_ease]"
          aria-describedby={undefined}
        >
          <RDialog.Title className="sr-only">Komut paleti</RDialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-fg-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sayfa, ürün veya komut ara…"
              aria-label="Ara"
              role="combobox"
              aria-expanded
              aria-controls="palette-list"
              aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((a) => Math.min(filtered.length - 1, a + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((a) => Math.max(0, a - 1))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  run(filtered[active])
                }
              }}
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-3 focus:outline-none"
            />
          </div>
          <div id="palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
            {filtered.length === 0 && <p className="px-3 py-10 text-center text-sm text-fg-3">Sonuç yok</p>}
            {groups.map((g) => (
              <div key={g} className="mb-1">
                <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-fg-3">{g}</div>
                {filtered
                  .filter((c) => c.group === g)
                  .map((c) => {
                    const i = filtered.indexOf(c)
                    const Icon = c.icon
                    return (
                      <div
                        key={c.id}
                        id={`cmd-${c.id}`}
                        role="option"
                        aria-selected={i === active}
                        onMouseMove={() => setActive(i)}
                        onClick={() => run(c)}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl px-3 text-sm',
                          i === active ? 'bg-surface-strong text-fg' : 'text-fg-2',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{c.label}</span>
                        {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-fg-3" />}
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
          <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-fg-3 sm:flex">
            <span>
              <kbd className="rounded border border-line px-1">N</kbd> yeni ürün
            </span>
            <span>
              <kbd className="rounded border border-line px-1">/</kbd> sayfada ara
            </span>
            <span>
              <kbd className="rounded border border-line px-1">⌘K</kbd> / <kbd className="rounded border border-line px-1">Ctrl K</kbd> palet
            </span>
            <span className="ml-auto">
              <kbd className="rounded border border-line px-1">↑↓</kbd> gez · <kbd className="rounded border border-line px-1">↵</kbd> aç
            </span>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
