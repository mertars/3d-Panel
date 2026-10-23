import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, EmptyState, GlassCard } from '@/components/ui'

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description: ReactNode
  part: string
  extra?: ReactNode
}

/** Henüz yapılmamış sayfalar için şık "yakında" boş durumu */
export function ComingSoon({ icon: Icon, title, description, part, extra }: ComingSoonProps) {
  return (
    <GlassCard className="mx-auto max-w-3xl" padded={false}>
      <EmptyState
        icon={<Icon />}
        badge={<Badge tone="brand">Yakında · {part}</Badge>}
        title={title}
        description={description}
        action={
          <>
            {extra}
            <Link
              to="/hesapla"
              className="brand-gradient inline-flex h-11 items-center gap-2 rounded-ctl px-4 text-sm font-medium text-white hover:brightness-110"
            >
              Hesapla’ya git
              <ArrowRight className="size-4" />
            </Link>
          </>
        }
      />
    </GlassCard>
  )
}
