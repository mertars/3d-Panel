import { useEffect } from 'react'
import { useUI } from '@/store/ui'
import { useMediaQuery } from './useMediaQuery'

/** Tema tercihini <html data-theme> üzerine uygular (sistem temasını izler) */
export function useApplyTheme() {
  const pref = useUI((s) => s.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#07070B' : '#F4F4F7')
  }, [resolved])
  return resolved
}
