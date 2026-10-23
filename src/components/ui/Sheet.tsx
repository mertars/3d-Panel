import * as RDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}

/** Alttan açılan panel (mobil) */
export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-[4px] data-[state=open]:animate-[fade-in_160ms_ease]" />
        <RDialog.Content
          className={cn(
            'solid-surface fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col rounded-t-[24px] border-b-0',
            'data-[state=open]:animate-[sheet-in_220ms_cubic-bezier(.2,.8,.2,1)]',
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden />
          <div className="flex items-center gap-3 px-5 pt-2 pb-1">
            <div className="min-w-0 flex-1">
              <RDialog.Title className="text-base font-semibold tracking-tight">{title}</RDialog.Title>
              <RDialog.Description className={description ? 'text-sm text-fg-2' : 'sr-only'}>
                {description ?? (typeof title === 'string' ? title : '')}
              </RDialog.Description>
            </div>
            <RDialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Kapat" className="-mr-2">
                <X />
              </Button>
            </RDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
