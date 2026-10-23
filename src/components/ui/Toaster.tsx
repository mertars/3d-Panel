import { AnimatePresence, m } from 'framer-motion'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useToasts, type Toast } from '@/store/toast'

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss)
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), t.duration)
    return () => window.clearTimeout(id)
  }, [t.id, t.duration, dismiss])

  const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'danger' ? CircleAlert : Info
  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      role="status"
      className="solid-surface pointer-events-auto flex w-full min-w-0 items-center gap-3 rounded-2xl py-2 pr-2 pl-4"
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          t.tone === 'success' ? 'text-success' : t.tone === 'danger' ? 'text-danger' : 'text-info',
        )}
      />
      <span className="min-w-0 flex-1 py-1.5 text-sm break-words text-fg">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick()
            dismiss(t.id)
          }}
          className="h-9 shrink-0 rounded-lg px-3 text-sm font-semibold text-brand-2 hover:bg-surface-strong"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => dismiss(t.id)}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-strong hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </m.div>
  )
}

/** Mobilde üstte, masaüstünde sağ altta */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[80] flex flex-col gap-2 lg:inset-x-auto lg:top-auto lg:right-6 lg:bottom-6 lg:w-[380px]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
