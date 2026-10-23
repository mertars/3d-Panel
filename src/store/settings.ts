import { create } from 'zustand'
import { getSettings, updateSettings, type AppSettings } from '@/db'
import { setMoneyFormatDefaults } from '@/lib/format'

interface SettingsState {
  settings: AppSettings | null
  load: () => Promise<void>
  update: (patch: Partial<Omit<AppSettings, 'id'>>) => Promise<void>
}

function applyFormat(s: AppSettings) {
  setMoneyFormatDefaults({ style: s.currencyStyle, compactDecimals: s.compactDecimals })
}

/** Ayarlar Dexie'de saklanır; bu store bellekteki kopyayı tutar ve yazarken senkronlar. */
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  load: async () => {
    const s = await getSettings()
    applyFormat(s)
    set({ settings: s })
  },
  update: async (patch) => {
    const current = get().settings
    if (current) {
      const optimistic = { ...current, ...patch }
      applyFormat(optimistic)
      set({ settings: optimistic })
    }
    const saved = await updateSettings(patch)
    applyFormat(saved)
    set({ settings: saved })
  },
}))

/** Yüklenmiş ayarlar (App, yüklenene kadar render etmez) */
export function useSettings(): AppSettings {
  const s = useSettingsStore((st) => st.settings)
  if (!s) throw new Error('Ayarlar henüz yüklenmedi')
  return s
}
