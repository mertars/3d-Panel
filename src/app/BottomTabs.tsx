import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { Sheet } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useUI } from '@/store/ui'
import { NAV } from './nav'
import { THEME_META } from './Sidebar'

const TAB_CLASS =
  'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors'

/** Mobil alt sekme çubuğu: Panel, Hesapla, Ürünler, Siparişler, Daha fazla */
export function BottomTabs({ hidden }: { hidden: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useUI((s) => s.theme)
  const cycleTheme = useUI((s) => s.cycleTheme)
  const tabs = NAV.filter((n) => n.tab)
  const more = NAV.filter((n) => !n.tab)
  const moreActive = more.some((n) => pathname.startsWith(n.to))
  const ThemeIcon = THEME_META[theme].icon

  return (
    <>
      <nav
        aria-label="Ana menü"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_oklab,var(--bg)_80%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden',
          hidden && 'hidden',
        )}
      >
        <ul className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex min-w-0 flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => cn(TAB_CLASS, isActive ? 'text-fg' : 'text-fg-3')}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-[22px]', isActive && 'text-brand-2')} />
                    <span className="max-w-full truncate px-1">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(TAB_CLASS, moreActive ? 'text-fg' : 'text-fg-3')}
              aria-haspopup="dialog"
            >
              <Ellipsis className={cn('size-[22px]', moreActive && 'text-brand-2')} />
              <span>Daha fazla</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Daha fazla">
        <ul className="grid grid-cols-2 gap-2 pb-2">
          {more.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  navigate(to)
                }}
                className={cn(
                  'inset-surface flex h-16 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-medium',
                  pathname.startsWith(to) ? 'text-fg' : 'text-fg-2',
                )}
              >
                <Icon className="size-5 shrink-0 text-brand-2" />
                <span className="truncate">{label}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={cycleTheme}
              className="inset-surface flex h-16 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-medium text-fg-2"
            >
              <ThemeIcon className="size-5 shrink-0" />
              <span className="truncate">{THEME_META[theme].label}</span>
            </button>
          </li>
        </ul>
      </Sheet>
    </>
  )
}
