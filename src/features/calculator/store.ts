import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { emptyDraft, rowKey, type Draft, type DraftExtra, type DraftFilament } from './draft'

interface CalculatorState {
  draft: Draft
  /** Taslağın kaydedilmemiş değişikliği var mı */
  dirty: boolean
  set: (patch: Partial<Draft>) => void
  replace: (draft: Draft) => void
  addFilament: (filamentId: string) => void
  updateFilament: (key: string, patch: Partial<DraftFilament>) => void
  removeFilament: (key: string) => void
  addExtra: () => void
  updateExtra: (key: string, patch: Partial<DraftExtra>) => void
  removeExtra: (key: string) => void
  markSaved: (productId: string) => void
}

export const useCalculator = create<CalculatorState>()(
  persist(
    (set) => ({
      draft: emptyDraft({ packaging: 10 }),
      dirty: false,
      set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch }, dirty: true })),
      replace: (draft) => set({ draft, dirty: false }),
      addFilament: (filamentId) =>
        set((s) => ({
          dirty: true,
          draft: {
            ...s.draft,
            filaments: [...s.draft.filaments, { key: rowKey(), filamentId, gram: null, purgeGram: null }],
          },
        })),
      updateFilament: (key, patch) =>
        set((s) => ({
          dirty: true,
          draft: { ...s.draft, filaments: s.draft.filaments.map((f) => (f.key === key ? { ...f, ...patch } : f)) },
        })),
      removeFilament: (key) =>
        set((s) => ({ dirty: true, draft: { ...s.draft, filaments: s.draft.filaments.filter((f) => f.key !== key) } })),
      addExtra: () =>
        set((s) => ({
          dirty: true,
          draft: { ...s.draft, extras: [...s.draft.extras, { key: rowKey(), name: '', amount: null }] },
        })),
      updateExtra: (key, patch) =>
        set((s) => ({
          dirty: true,
          draft: { ...s.draft, extras: s.draft.extras.map((e) => (e.key === key ? { ...e, ...patch } : e)) },
        })),
      removeExtra: (key) =>
        set((s) => ({ dirty: true, draft: { ...s.draft, extras: s.draft.extras.filter((e) => e.key !== key) } })),
      markSaved: (productId) => set((s) => ({ dirty: false, draft: { ...s.draft, productId } })),
    }),
    {
      name: 'katman-calculator',
      storage: createJSONStorage(() => sessionStorage),
      // Fotoğraf (Blob) JSON'a yazılamaz; yalnızca bellekte tutulur
      partialize: (s) => ({ draft: { ...s.draft, photo: null }, dirty: s.dirty }),
    },
  ),
)
