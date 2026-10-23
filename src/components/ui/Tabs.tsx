import * as RTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Tabs = RTabs.Root
export const TabsContent = RTabs.Content

export function TabsList({ tabs, className, 'aria-label': label }: { tabs: { value: string; label: ReactNode }[]; className?: string; 'aria-label': string }) {
  return (
    <RTabs.List aria-label={label} className={cn('inset-surface inline-flex min-w-0 rounded-ctl p-1', className)}>
      {tabs.map((t) => (
        <RTabs.Trigger
          key={t.value}
          value={t.value}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[9px] px-4 text-sm font-medium whitespace-nowrap text-fg-2 transition-colors hover:text-fg data-[state=active]:border data-[state=active]:border-line-strong data-[state=active]:bg-surface-strong data-[state=active]:text-fg lg:h-9"
        >
          {t.label}
        </RTabs.Trigger>
      ))}
    </RTabs.List>
  )
}
