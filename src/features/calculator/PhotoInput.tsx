import { ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { compressImage } from '@/lib/image'
import { cn } from '@/lib/cn'
import { toast } from '@/store/toast'

interface PhotoInputProps {
  value: Blob | null
  onChange: (blob: Blob | null) => void
}

/** Cihazdan fotoğraf yükler, ~400 KB altına sıkıştırır */
export function PhotoInput({ value, onChange }: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!value) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(value)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [value])

  async function handle(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Lütfen bir görsel dosyası seç', { tone: 'danger' })
      return
    }
    setBusy(true)
    try {
      onChange(await compressImage(file))
    } catch {
      toast('Fotoğraf işlenemedi', { tone: 'danger' })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative size-24 shrink-0 sm:size-28">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void handle(e.dataTransfer.files[0])
        }}
        aria-label={value ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}
        className={cn(
          'group flex size-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line-strong bg-field text-fg-3 transition-colors hover:border-brand-2/50 hover:text-fg-2',
          value && 'border-solid',
          busy && 'animate-pulse',
        )}
      >
        {url ? (
          <img src={url} alt="Ürün fotoğrafı" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[11px]">
            <ImagePlus className="size-5" />
            Fotoğraf
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Fotoğrafı kaldır"
          className="solid-surface absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full text-fg-2 hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void handle(e.target.files?.[0])}
      />
    </div>
  )
}
