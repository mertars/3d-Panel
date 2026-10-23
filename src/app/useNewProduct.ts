import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { getProduct, listFilamentTypes, listPrinters } from '@/db'
import { draftFromProduct, emptyDraft } from '@/features/calculator/draft'
import { useCalculator } from '@/features/calculator/store'
import { useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toast'

/** Boş taslak için varsayılanlar: ilk filament türü, varsayılan yazıcı, varsayılan ambalaj */
export async function freshDraft() {
  const [types, printers] = await Promise.all([listFilamentTypes(), listPrinters()])
  const printer = printers.find((p) => p.isDefault) ?? printers[0]
  return emptyDraft({
    packaging: useSettingsStore.getState().settings?.defaultPackaging ?? 0,
    filamentId: types[0]?.id,
    printerId: printer?.id ?? null,
  })
}

/** Taslağı değiştirir; kaydedilmemiş değişiklik varsa "Geri al" toast'ı verir */
function replaceWithUndo(next: ReturnType<typeof emptyDraft>, message: string) {
  const prev = useCalculator.getState()
  useCalculator.getState().replace(next)
  if (prev.dirty) {
    toast(message, {
      action: { label: 'Geri al', onClick: () => useCalculator.setState({ draft: prev.draft, dirty: prev.dirty }) },
    })
  }
}

export function useNewProduct() {
  const navigate = useNavigate()
  return useCallback(async () => {
    replaceWithUndo(await freshDraft(), 'Yeni ürün başlatıldı — önceki taslak kaldırıldı')
    navigate('/hesapla')
  }, [navigate])
}

export function useOpenProduct() {
  const navigate = useNavigate()
  return useCallback(
    async (id: string) => {
      const p = await getProduct(id)
      if (!p) return
      replaceWithUndo(draftFromProduct(p), `“${p.name}” açıldı — önceki taslak kaldırıldı`)
      navigate('/hesapla')
    },
    [navigate],
  )
}
