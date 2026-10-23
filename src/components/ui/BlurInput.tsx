import { forwardRef, useEffect, useState, type ComponentProps } from 'react'
import { Input } from './Input'

type BlurInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'defaultValue'> & {
  value: string
  /** Odak çıkınca veya Enter'da çağrılır (yalnızca değer değiştiyse) */
  onCommit: (value: string) => void
}

/**
 * Metni yerelde tutar, odak çıkınca kaydeder. Canlı sorgulara bağlı alanlarda
 * her tuşta veritabanına yazıp imleci kaydırmamak için.
 */
export const BlurInput = forwardRef<HTMLInputElement, BlurInputProps>(function BlurInput({ value, onCommit, onBlur, onKeyDown, ...rest }, ref) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = () => {
    if (text !== value) onCommit(text)
  }
  return (
    <Input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => {
        commit()
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.currentTarget.form === null) commit()
        onKeyDown?.(e)
      }}
      {...rest}
    />
  )
})
