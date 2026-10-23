import * as RTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
}

/** Yalnızca ek bilgi için (ikon düğmeleri vb.). Asıl açıklamalar için InfoTip kullan. */
export function Tooltip({ content, children, side = 'top', disabled }: TooltipProps) {
  if (disabled) return <>{children}</>
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={8}
          className="solid-surface z-[75] rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg"
        >
          {content}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}

export const TooltipProvider = RTooltip.Provider
