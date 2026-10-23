import { MotionConfig } from 'framer-motion'
import { lazy, useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster, TooltipProvider } from '@/components/ui'
import { useApplyTheme } from '@/hooks/useTheme'
import {
  ChannelsPage,
  DashboardPage,
  FilamentsPage,
  OrdersPage,
  PrintersPage,
  ProductsPage,
  QuotesPage,
} from '@/pages/placeholders'
import { useSettingsStore } from '@/store/settings'
import { useUI } from '@/store/ui'
import { LogoMark } from './Logo'
import { AppShell } from './AppShell'
import { Backdrop } from './Backdrop'

const CalculatorPage = lazy(() => import('@/pages/CalculatorPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard'))

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'hesapla', element: <CalculatorPage /> },
      { path: 'urunler', element: <ProductsPage /> },
      { path: 'siparisler', element: <OrdersPage /> },
      { path: 'teklifler', element: <QuotesPage /> },
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
