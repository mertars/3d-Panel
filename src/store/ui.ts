import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePref = 'dark' | 'light' | 'system'

interface UIState {
  theme: ThemePref
  sidebarCollapsed: boolean
  paletteOpen: boolean
  wizardOpen: boolean
  productsView: 'grid' | 'list'
  setProductsView: (v: 'grid' | 'list') => void
  setTheme: (t: ThemePref) => void
  cycleTheme: () => void
  toggleSidebar: () => void
  setPaletteOpen: (open: boolean) => void
  setWizardOpen: (open: boolean) => void
}

const ORDER: ThemePref[] = ['dark', 'light', 'system']

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      paletteOpen: false,
      wizardOpen: false,
      productsView: 'grid',
      setProductsView: (productsView) => set({ productsView }),
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => set({ theme: ORDER[(ORDER.indexOf(get().theme) + 1) % ORDER.length] }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setWizardOpen: (wizardOpen) => set({ wizardOpen }),
    }),
    {
      name: 'katman-ui',
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, productsView: s.productsView }),
    },
  ),
)
