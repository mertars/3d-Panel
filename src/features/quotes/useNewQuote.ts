import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { createQuote } from '@/db'
import { useSettingsStore } from '@/store/settings'

export function useNewQuote() {
  const navigate = useNavigate()
  return useCallback(async () => {
    const settings = useSettingsStore.getState().settings
    if (!settings) return
    const q = await createQuote(settings)
    navigate(`/teklifler/${q.id}`)
  }, [navigate])
}
