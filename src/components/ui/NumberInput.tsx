import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatNumber, parseLocaleNumber } from '@/lib/format'
import { fieldBase } from './Input'

export interface NumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  /** Sağdaki birim etiketi: ₺, g, saat, dk, %, W … */
  unit?: ReactNode
  step?: number
  min?: number
  max?: number
  /** Varsayılan: virgül/nokta kabul eden sayı ayrıştırıcı */
  parse?: (text: string) => number | null
  /** Odak dışında gösterilecek metin */
  format?: (value: number) => string
  placeholder?: string
  id?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  invalid?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
  autoFocus?: boolean
  /** Geçersiz metin girildiğinde çağrılır (ör. hata mesajı göstermek için) */
  onInvalidChange?: (invalid: boolean) => void
}

const defaultFormat = (v: number) => formatNumber(v)

function clamp(v: number, min?: number, max?: number) {
  if (min !== undefined && v < min) return min
  if (max !== undefined && v > max) return max
  return v
}

/**
 * Sayı girişi: virgül ve nokta kabul eder, ok tuşlarıyla artırır/azaltır
 * (Shift ×10, Alt ×0,1), sağda birim etiketi gösterir.
 */
export function NumberInput({
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
  max,
  parse = parseLocaleNumber,
  format = defaultFormat,
  placeholder,
  id,
  className,
  inputClassName,
  disabled,
  invalid,
  autoFocus,
  onInvalidChange,
  ...aria
}: NumberInputProps) {
  const autoId = useId()
  const [text, setText] = useState(() => (value === null ? '' : format(value)))
  const [badText, setBadText] = useState(false)
  const focused = useRef(false)

  // Dışarıdan gelen değer değişince (odakta değilken) metni senkronla
  useEffect(() => {
    if (focused.current) return
    setText(value === null ? '' : format(value))
  }, [value, format])

  function commit(next: string) {
    setText(next)
    if (next.trim() === '') {
      setBadText(false)
      onInvalidChange?.(false)
      onChange(null)
      return
    }
    const parsed = parse(next)
    const bad = parsed === null
    setBadText(bad)
    onInvalidChange?.(bad)
    if (parsed !== null) onChange(clamp(parsed, min, max))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * mult
    const next = clamp(Math.round(((value ?? 0) + delta) * 1e6) / 1e6, min, max)
    onChange(next)
    setText(formatNumber(next))
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      <input
        id={id ?? autoId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={invalid || badText || undefined}
        value={text}
        onChange={(e) => commit(e.target.value)}
        onFocus={() => {
          focused.current = true
        }}
        onBlur={() => {
          focused.current = false
          if (!badText) setText(value === null ? '' : format(value))
        }}
        onKeyDown={onKeyDown}
        className={cn(fieldBase, 'tnum h-11 px-3 text-sm', unit ? 'pr-14' : '', inputClassName)}
        {...aria}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-fg-3">
          {unit}
        </span>
      )}
    </div>
  )
}
