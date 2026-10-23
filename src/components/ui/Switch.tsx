import * as RSwitch from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  'aria-label'?: string
  className?: string
}

export function Switch({ checked, onChange, id, className, ...aria }: SwitchProps) {
  return (
    <RSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      aria-label={aria['aria-label']}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-line bg-surface-strong transition-colors',
        'data-[state=checked]:brand-gradient data-[state=checked]:border-transparent',
        // görünmez genişletilmiş dokunma alanı (44px)
        "before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-['']",
        className,
      )}
    >
      <RSwitch.Thumb className="block size-[18px] translate-x-[3px] rounded-full bg-white shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[19px]" />
    </RSwitch.Root>
  )
}
