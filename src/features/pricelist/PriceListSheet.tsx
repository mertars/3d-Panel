import { forwardRef } from 'react'
import type { AppSettings } from '@/db'
import { useBlobUrl } from '@/hooks/useBlobUrl'
import { cn } from '@/lib/cn'
import { formatDate, formatTL } from '@/lib/format'

export interface PriceListRow {
  key: string
  name: string
  detail?: string
  price: number
  photo: Blob | null
}

export type PriceListFormat = 'a4' | 'story'

/** Ölçüler (CSS px): A4 @96dpi ve Instagram hikâyesi */
export const SHEET_SIZE: Record<PriceListFormat, { width: number; height: number | null }> = {
  a4: { width: 794, height: null },
  story: { width: 1080, height: 1920 },
}

/** Hikâyede sığan en fazla ürün */
export const STORY_MAX = 10

function Thumb({ photo, story }: { photo: Blob | null; story: boolean }) {
  const url = useBlobUrl(photo)
  return (
    <div className={cn('shrink-0 overflow-hidden bg-[#f1f1f4]', story ? 'size-[104px] rounded-[24px]' : 'aspect-square w-full rounded-[14px]')}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <div className="size-full bg-[linear-gradient(135deg,#ffe8d6,#efe7ff)]" />}
    </div>
  )
}

interface Props {
  rows: PriceListRow[]
  title: string
  format: PriceListFormat
  settings: Pick<AppSettings, 'brandName' | 'brandContact' | 'brandLogo'>
}

/**
 * Müşteriye gösterilen fiyat listesi — sabit açık renkli "belge" (temadan bağımsız).
 * Yalnızca ad + fiyat (+ fotoğraf); maliyet/kâr asla yer almaz.
 */
export const PriceListSheet = forwardRef<HTMLDivElement, Props>(function PriceListSheet({ rows, title, format, settings }, ref) {
  const logo = useBlobUrl(settings.brandLogo)
  const story = format === 'story'
  const list = story ? rows.slice(0, STORY_MAX) : rows
  const size = SHEET_SIZE[format]
  return (
    <div
      ref={ref}
      className={cn('pricelist-sheet relative flex flex-col overflow-hidden bg-white text-[#0b0b12]', story ? 'px-[72px] pt-[110px] pb-[90px]' : 'rounded-[18px] p-12')}
      style={{ width: size.width, height: size.height ?? undefined, minHeight: story ? undefined : 1123, fontFamily: 'var(--font-sans)', colorScheme: 'light' }}
    >
      <div className={cn('absolute inset-x-0 top-0 bg-[linear-gradient(90deg,#FF7A18,#FF3D77,#7C5CFF)]', story ? 'h-4' : 'h-2')} />
      {story && <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-[#FF3D77] opacity-[0.08] blur-3xl" />}

      <header className="flex items-center gap-4">
        {logo ? (
          <img src={logo} alt="" className={story ? 'h-24 w-auto max-w-[240px] object-contain' : 'h-12 w-auto max-w-[140px] object-contain'} />
        ) : (
          <div className={cn('flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FF7A18,#FF3D77,#7C5CFF)] font-bold text-white', story ? 'size-24 text-5xl' : 'size-12 text-2xl')}>
            {(settings.brandName || 'K').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className={cn('font-semibold tracking-tight', story ? 'text-5xl' : 'text-xl')}>{settings.brandName || 'Fiyat listesi'}</div>
          {settings.brandContact && <div className={cn('text-[#6b6b76]', story ? 'mt-1 text-3xl' : 'text-sm')}>{settings.brandContact}</div>}
        </div>
      </header>

      <h1 className={cn('font-bold tracking-[-0.03em]', story ? 'mt-16 text-[88px] leading-none' : 'mt-8 text-4xl')}>{title || 'Fiyat listesi'}</h1>
      <p className={cn('text-[#6b6b76]', story ? 'mt-4 text-3xl' : 'mt-2 text-sm')}>{formatDate(Date.now())} itibarıyla</p>

      {story ? (
        <ul className="mt-14 flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
          {list.map((r) => (
            <li key={r.key} className="flex min-w-0 items-center gap-8">
              <Thumb photo={r.photo} story />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[36px] leading-tight font-semibold">{r.name}</div>
                {r.detail && <div className="truncate text-[26px] text-[#6b6b76]">{r.detail}</div>}
              </div>
              <div className="tnum shrink-0 text-[52px] font-bold tracking-[-0.03em]">{formatTL(r.price, { compactDecimals: true })}</div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-8 grid grid-cols-3 gap-5">
          {list.map((r) => (
            <li key={r.key} className="flex min-w-0 flex-col rounded-[18px] border border-[#ececf1] p-3">
              <Thumb photo={r.photo} story={false} />
              <div className="mt-3 min-w-0 flex-1">
                <div className="text-[15px] leading-snug font-semibold break-words">{r.name}</div>
                {r.detail && <div className="text-xs text-[#6b6b76]">{r.detail}</div>}
              </div>
              <div className="tnum mt-2 text-xl font-bold tracking-[-0.02em]">{formatTL(r.price, { compactDecimals: true })}</div>
            </li>
          ))}
        </ul>
      )}

      <footer className={cn('mt-auto pt-8 text-center text-[#9a9aa3]', story ? 'text-3xl' : 'text-xs')}>
        {story && rows.length > STORY_MAX ? `+${rows.length - STORY_MAX} ürün daha · ` : ''}
        Sipariş için bize yazın{settings.brandContact ? ` · ${settings.brandContact}` : ''}
      </footer>
    </div>
  )
})
