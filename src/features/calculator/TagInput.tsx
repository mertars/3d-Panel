import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import { fieldBase } from '@/components/ui'
import { cn } from '@/lib/cn'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  id?: string
}

/** Enter veya virgülle etiket ekler; Backspace ile sonuncuyu siler */
export function TagInput({ value, onChange, id }: TagInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add(raw: string) {
    const parts = raw
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
    const next = [...value]
    for (const p of parts) if (!next.some((t) => t.toLocaleLowerCase('tr-TR') === p.toLocaleLowerCase('tr-TR'))) next.push(p)
    if (next.length !== value.length) onChange(next.slice(0, 20))
    setText('')
  }

  return (
    // Kapsayıcının tamamı (44px) dokunma hedefi: tıklayınca girişe odaklanır
    <div
      onClick={(e) => e.target === e.currentTarget && inputRef.current?.focus()}
      className={cn(fieldBase, 'flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-brand-2/60 focus-within:ring-3 focus-within:ring-brand-2/15')}>
      {value.map((t) => (
        <span key={t} className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-surface-strong pr-1 pl-2.5 text-xs text-fg">
          <span className="truncate">{t}</span>
          <button
            type="button"
            aria-label={`${t} etiketini kaldır`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="flex size-5 items-center justify-center rounded-full text-fg-3 hover:text-fg"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={text}
        onChange={(e) => {
          if (e.target.value.includes(',')) add(e.target.value)
          else setText(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(text)
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => text && add(text)}
        placeholder={value.length ? '' : 'ör. hediye, pastel'}
        className="h-8 min-w-24 flex-1 bg-transparent px-1 text-sm text-fg placeholder:text-fg-3 focus:outline-none focus-visible:outline-none"
      />
    </div>
  )
}
