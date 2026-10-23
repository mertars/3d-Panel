import { MotionConfig } from 'framer-motion'
import { lazy, useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster, TooltipProvider } from '@/components/ui'
import { useApplyTheme } from '@/hooks/useTheme'
import { useSettingsStore } from '@/store/settings'
import { useUI } from '@/store/ui'
import { LogoMark } from './Logo'
import { AppShell } from './AppShell'
import { Backdrop } from './Backdrop'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CalculatorPage = lazy(() => import('@/pages/CalculatorPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ProductsPage = lazy(() => import('@/pages/ProductsPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const FilamentsPage = lazy(() => import('@/pages/FilamentsPage'))
const PrintersPage = lazy(() => import('@/pages/PrintersPage'))
const ChannelsPage = lazy(() => import('@/pages/ChannelsPage'))
const QuotesPage = lazy(() => import('@/pages/QuotesPage'))
const QuoteEditorPage = lazy(() => import('@/pages/QuoteEditorPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const OrderEditorPage = lazy(() => import('@/pages/OrderEditorPage'))
const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard'))

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'hesapla', element: <CalculatorPage /> },
      { path: 'urunler', element: <ProductsPage /> },
      { path: 'urunler/:id', element: <ProductDetailPage /> },
      { path: 'siparisler', element: <OrdersPage /> },
      { path: 'siparisler/:id', element: <OrderEditorPage /> },
      { path: 'teklifler', element: <QuotesPage /> },
      { path: 'teklifler/:id', element: <QuoteEditorPage /> },
      { path: 'filamentler', element: <FilamentsPage /> },
      { path: 'yazicilar', element: <PrintersPage /> },
      { path: 'kanallar', element: <ChannelsPage /> },
      { path: 'ayarlar', element: <SettingsPage /> },
      { path: '*', element: <DashboardPage /> },
    ],
  },
])

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  )
}

export function App() {
  useApplyTheme()
  const settings = useSettingsStore((s) => s.settings)
  const load = useSettingsStore((s) => s.load)
  const wizardOpen = useUI((s) => s.wizardOpen)
  const setWizardOpen = useUI((s) => s.setWizardOpen)

  useEffect(() => {
    void load()
  }, [load])

  // İlk açılışta sihirbaz
  useEffect(() => {
    if (settings && !settings.onboarded) setWizardOpen(true)
  }, [settings, setWizardOpen])

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <Backdrop />
        {settings ? (
          <>
            <RouterProvider router={router} />
            {wizardOpen && <OnboardingWizard />}
          </>
        ) : (
          <Splash />
        )}
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
  )
}
