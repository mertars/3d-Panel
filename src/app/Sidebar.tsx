import { Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import { NavLink } from 'react-router'
import { Tooltip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useUI, type ThemePref } from '@/store/ui'
import { Logo } from './Logo'
import { NAV } from './nav'

export const THEME_META: Record<ThemePref, { label: string; icon: typeof Sun }> = {
  dark: { label: 'Koyu tema', icon: Moon },
  light: { label: 'Açık tema', icon: Sun },
  system: { label: 'Sistem teması', icon: Monitor },
}

export function Sidebar() {
  const collapsed = useUI((s) => s.sidebarCollapsed)
  const toggle = useUI((s) => s.toggleSidebar)
  const theme = useUI((s) => s.theme)
  const cycleTheme = useUI((s) => s.cycleTheme)
  const ThemeIcon = THEME_META[theme].icon

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-xl transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between pr-3 pl-5')}>
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <Tooltip content="Daralt" side="right">
            <button
              type="button"
              onClick={toggle}
              aria-label="Kenar çubuğunu daralt"
              className="flex size-9 items-center justify-center rounded-lg text-fg-3 hover:bg-surface hover:text-fg"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <nav aria-label="Ana menü" className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Tooltip content={label} side="right" disabled={!collapsed}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  aria-label={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-10 items-center gap-3 rounded-ctl text-sm font-medium transition-colors',
                      collapsed ? 'justify-center' : 'px-3',
                      isActive ? 'bg-surface-strong text-fg' : 'text-fg-2 hover:bg-surface hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="brand-gradient absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full" aria-hidden />
                      )}
                      <Icon className={cn('size-[18px] shrink-0', isActive && 'text-brand-2')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn('flex shrink-0 flex-col gap-1 border-t border-line p-3')}>
        {collapsed && (
          <Tooltip content="Genişlet" side="right">
            <button
              type="button"
              onClick={toggle}
              aria-label="Kenar çubuğunu genişlet"
              className="flex h-10 items-center justify-center rounded-ctl text-fg-2 hover:bg-surface hover:text-fg"
            >
              <PanelLeftOpen className="size-[18px]" />
            </button>
          </Tooltip>
        )}
        <Tooltip content={`${THEME_META[theme].label} — değiştir`} side="right">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Tema: ${THEME_META[theme].label}. Değiştirmek için tıkla`}
            className={cn(
              'flex h-10 items-center gap-3 rounded-ctl text-sm text-fg-2 hover:bg-surface hover:text-fg',
              collapsed ? 'justify-center' : 'px-3',
            )}
          >
            <ThemeIcon className="size-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{THEME_META[theme].label}</span>}
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
