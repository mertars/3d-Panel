import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatHours, formatNumber, parseDuration } from '@/lib/format'
import { fieldBase } from './Input'

interface DurationInputProps {
  /** Saat (ondalık) */
  value: number | null
  onChange: (hours: number | null) => void
  id?: string
  placeholder?: string
  className?: string
  'aria-describedby'?: string
}

/**
 * Akıllı süre girişi. "4,5", "4:30", "4s 30dk", "1h 23m" (Bambu Studio) gibi
 * biçimleri kabul eder; altında anlaşılan süreyi gösterir.
 */
export function DurationInput({ value, onChange, id, placeholder = 'ör. 4:30 veya 1h 23m', className, ...aria }: DurationInputProps) {
  const autoId = useId()
  const hintId = `${autoId}-hint`
  const [text, setText] = useState(() => (value === null ? '' : formatNumber(value)))
  const [bad, setBad] = useState(false)
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(value === null ? '' : formatNumber(value))
  }, [value])

  function change(next: string) {
    setText(next)
    if (!next.trim()) {
      setBad(false)
      onChange(null)
      return
    }
    const h = parseDuration(next)
    setBad(h === null)
    if (h !== null) onChange(h)
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div className="relative">
        <input
          id={id ?? autoId}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={bad || undefined}
          aria-describedby={[hintId, aria['aria-describedby']].filter(Boolean).join(' ')}
          value={text}
          onChange={(e) => change(e.target.value)}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={() => {
            focused.current = false
          }}
          className={cn(fieldBase, 'tnum h-11 px-3 pr-14 text-sm')}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-fg-3">saat</span>
      </div>
      <p id={hintId} className={cn('mt-1.5 text-xs', bad ? 'text-danger' : 'text-fg-3')} aria-live="polite">
        {bad ? 'Anlaşılamadı — 4,5 · 4:30 · 4s 30dk · 1h 23m dene' : value ? `= ${formatHours(value)}` : '4,5 · 4:30 · 4s 30dk · 1h 23m'}
      </p>
    </div>
  )
}
