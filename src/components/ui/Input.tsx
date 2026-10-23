import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const fieldBase =
  'w-full min-w-0 rounded-ctl border border-line bg-field text-fg placeholder:text-fg-3 transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-line-strong focus:border-brand-2/60 focus:outline-none focus:ring-3 focus:ring-brand-2/15 ' +
  'aria-[invalid=true]:border-danger/60 aria-[invalid=true]:ring-danger/15 disabled:opacity-50'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, ...rest },
  ref,
) {
  return (
    <div className="relative min-w-0">
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3 [&_svg]:size-4">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        className={cn(fieldBase, 'h-11 px-3 text-sm', leading && 'pl-9', trailing && 'pr-12', className)}
        {...rest}
      />
      {trailing && (
        <span className="absolute inset-y-0 right-3 flex items-center text-[13px] text-fg-3">{trailing}</span>
      )}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, 'min-h-24 px-3 py-2.5 text-sm', className)} {...rest} />
  },
)
