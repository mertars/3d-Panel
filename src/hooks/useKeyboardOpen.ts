import { useEffect, useState } from 'react'

/**
 * Mobilde yazılım klavyesi açık mı? visualViewport yüksekliği pencereden belirgin
 * şekilde küçükse klavye açık kabul edilir (alt çubuklar gizlenir, yukarı kaymaz).
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const check = () => {
      const active = document.activeElement
      const typing = active instanceof HTMLElement && active.matches('input, textarea, select, [contenteditable=true]')
      setOpen(typing && window.innerHeight - vv.height > 140)
    }
    const deferred = () => window.setTimeout(check, 50)
    vv.addEventListener('resize', check)
    window.addEventListener('focusin', check)
    window.addEventListener('focusout', deferred)
    return () => {
      vv.removeEventListener('resize', check)
      window.removeEventListener('focusin', check)
      window.removeEventListener('focusout', deferred)
    }
  }, [])
  return open
}
