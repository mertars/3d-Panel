import * as RMenu from '@radix-ui/react-dropdown-menu'
import { Ellipsis, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

/** "…" eylem menüsü */
export function Menu({ items, label = 'Eylemler', className }: { items: MenuItem[]; label?: string; className?: string }) {
  return (
    <RMenu.Root modal={false}>
      <RMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className={className}>
          <Ellipsis />
        </Button>
      </RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content align="end" sideOffset={6} collisionPadding={12} className="solid-surface z-[70] min-w-[200px] rounded-xl p-1.5">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <RMenu.Item
                key={it.label}
                disabled={it.disabled}
                onSelect={it.onSelect}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-strong lg:min-h-9',
                  it.danger ? 'text-danger' : 'text-fg',
                )}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                {it.label}
              </RMenu.Item>
            )
          })}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  )
}
