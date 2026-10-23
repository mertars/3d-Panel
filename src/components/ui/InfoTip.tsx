import * as Popover from '@radix-ui/react-popover'
import { Info } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

/**
 * ⓘ açıklama. Popover tabanlı: masaüstünde üzerine gelince, dokunmatikte dokununca açılır,
 * klavyeyle odaklanıp Enter ile açılabilir.
 */
export function InfoTip({ children, label = 'Açıklama' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const hover = (next: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), next ? 120 : 160)
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={label}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full text-fg-3 transition-colors hover:text-fg-2 before:absolute before:-inset-3 before:content-['']"
      >
        <Info className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="solid-surface z-[70] max-w-[min(300px,calc(100vw-24px))] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed text-fg-2"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
