import * as RSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fieldBase } from './Input'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  description?: string
  group?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  id?: string
  className?: string
  'aria-label'?: string
  disabled?: boolean
  /** Listenin sonuna eklenen özel öğe (ör. "+ Yazıcı ekle") */
  footer?: ReactNode
}

export function Select({ value, onChange, options, placeholder = 'Seç…', id, className, disabled, footer, ...aria }: SelectProps) {
  const selected = options.find((o) => o.value === value)
  const groups = Array.from(new Set(options.map((o) => o.group ?? '')))
  return (
    <RSelect.Root value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <RSelect.Trigger
        id={id}
        aria-label={aria['aria-label']}
        className={cn(fieldBase, 'flex h-11 items-center gap-2 px-3 text-left text-sm data-[placeholder]:text-fg-3', className)}
      >
        {selected?.icon}
        <span className="min-w-0 flex-1 truncate">
          <RSelect.Value placeholder={placeholder}>{selected?.label}</RSelect.Value>
        </span>
        <RSelect.Icon>
          <ChevronDown className="size-4 text-fg-3" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="solid-surface z-[70] max-h-[min(360px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[220px] overflow-hidden rounded-xl"
        >
          <RSelect.Viewport className="p-1.5">
            {groups.map((g) => (
              <RSelect.Group key={g || 'default'}>
                {g && <RSelect.Label className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-fg-3">{g}</RSelect.Label>}
                {options
                  .filter((o) => (o.group ?? '') === g)
                  .map((o) => (
                    <RSelect.Item
                      key={o.value}
                      value={o.value}
                      className="relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg py-2 pr-8 pl-2.5 text-sm text-fg outline-none select-none data-[highlighted]:bg-surface-strong lg:min-h-9"
                    >
                      {o.icon}
                      <div className="min-w-0 flex-1">
                        <RSelect.ItemText>{o.label}</RSelect.ItemText>
                        {o.description && <div className="truncate text-xs text-fg-3">{o.description}</div>}
                      </div>
                      <RSelect.ItemIndicator className="absolute right-2.5">
                        <Check className="size-4 text-brand-2" />
                      </RSelect.ItemIndicator>
                    </RSelect.Item>
                  ))}
              </RSelect.Group>
            ))}
            {footer && <div className="mt-1 border-t border-line pt-1">{footer}</div>}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}
