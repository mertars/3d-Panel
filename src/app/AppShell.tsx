import { motion, useReducedMotion } from 'framer-motion'
import { createContext, Suspense, useContext, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Skeleton } from '@/components/ui'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { cn } from '@/lib/cn'
import { useUI } from '@/store/ui'
import { BottomTabs } from './BottomTabs'
import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface LayoutInfo {
  /** İçerik alanının genişliği (px) — sayfalar düzen kararını buna göre verir */
  contentWidth: number
  /** Mobil alt sekme çubuğu görünür mü */
  bottomBar: boolean
  keyboardOpen: boolean
}

const LayoutContext = createContext<LayoutInfo>({ contentWidth: 1200, bottomBar: false, keyboardOpen: false })
export const useLayout = () => useContext(LayoutContext)

function PageFallback() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  )
}

export function AppShell() {
  const collapsed = useUI((s) => s.sidebarCollapsed)
  const { pathname } = useLocation()
  const keyboardOpen = useKeyboardOpen()
  const reduce = useReducedMotion()
  const mainRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Omit<LayoutInfo, 'keyboardOpen'>>({ contentWidth: 1200, bottomBar: false })

  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    const measure = () =>
      setLayout({ contentWidth: el.clientWidth, bottomBar: !window.matchMedia('(min-width: 1024px)').matches })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <LayoutContext.Provider value={{ ...layout, keyboardOpen }}>
      <a
        href="#main"
        className="sr-only z-[90] rounded-ctl bg-elevated px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        İçeriğe geç
      </a>
      <div className="no-print">
        <Sidebar />
      </div>
      <div className={cn('min-w-0 transition-[padding] duration-200 print:pl-0!', collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]')}>
        <TopBar />
        <main
          id="main"
          className={cn(
            'mx-auto w-full max-w-[1440px] min-w-0 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12 print:p-0!',
            // Mobilde alt sekme çubuğu + mini fiyat çubuğu için yer bırak
            'pb-[calc(152px+env(safe-area-inset-bottom))]',
          )}
        >
          <div ref={mainRef} className="min-w-0">
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="min-w-0"
            >
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </div>
        </main>
      </div>
      <div className="no-print">
        <BottomTabs hidden={keyboardOpen} />
      </div>
      <CommandPalette />
    </LayoutContext.Provider>
  )
}
