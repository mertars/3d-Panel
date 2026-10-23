import { useEffect } from 'react'
import { useUI } from '@/store/ui'
import { useNewProduct } from './useNewProduct'

/** Yazı yazılan bir alanda mıyız? (kısayollar orada devre dışı) */
function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('[role=combobox],[role=listbox],[role=menu]') !== null
}

/**
 * Genel klavye kısayolları:
 *  N  → yeni ürün
 *  /  → sayfadaki aramaya odaklan (yoksa komut paleti)
 *  ⌘K / Ctrl+K → komut paleti (CommandPalette içinde)
 */
export function useShortcuts() {
  const newProduct = useNewProduct()
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return
      // Açık bir diyalog/sheet varken kısayol yok
      if (document.querySelector('[role=dialog][data-state=open]')) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        void newProduct()
      } else if (e.key === '/') {
        e.preventDefault()
        const search = document.querySelector<HTMLInputElement>('[data-page-search]')
        if (search) search.focus()
        else setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newProduct, setPaletteOpen])
}
