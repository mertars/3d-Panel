import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'brand-gradient text-white shadow-[0_8px_24px_-10px_rgba(255,61,119,0.65)] hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-strong text-fg border border-line hover:bg-surface-hover hover:border-line-strong',
  ghost: 'text-fg-2 hover:text-fg hover:bg-surface',
  danger: 'bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20',
}

/* Dokunma hedefi: md ve üstü ≥44px; sm masaüstünde 36px, mobilde 44px */
const sizes: Record<ButtonSize, string> = {
  sm: 'h-11 lg:h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
  icon: 'size-11 lg:size-10 justify-center',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-ctl font-medium whitespace-nowrap transition-[background-color,border-color,filter,color] duration-150 select-none',
        'disabled:pointer-events-none disabled:opacity-45',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  )
})
