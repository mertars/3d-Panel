import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { Badge, InfoTip, Segmented } from '@/components/ui'
import type { Channel } from '@/db'
import { formatPercent, formatTL } from '@/lib/format'
import { channelListPrice, effectiveChannelRate } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { channelFeeInput } from './fees'

export interface ChannelTarget {
  value: string
  label: string
  amount: number
}

interface Props {
  channels: Channel[]
  targets: ChannelTarget[]
  defaultTarget?: string
}

/**
 * Kanal fiyat tablosu (tersine hesap): hedef tutarın eline geçmesi için her kanaldaki
 * liste fiyatı, kanal kesintisi ve elde kalan. Tablo yerine kart listesi — dar ekranda taşmaz.
 */
export function ChannelPriceTable({ channels, targets, defaultTarget }: Props) {
  const settings = useSettings()
  const [selected, setSelected] = useState(defaultTarget ?? targets[0]?.value)
  const target = targets.find((t) => t.value === selected) ?? targets[0]
  const enabled = channels.filter((c) => c.enabled)

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">Kanal fiyatları</h3>
          <InfoTip>
            Hedef tutarın eline geçmesi için her kanalda listelemen gereken fiyat. Komisyon, sabit ücret, varsa komisyon KDV’si ve
            satıcı kargosu dahil. Oranları satıcı panelinden doğrula.
          </InfoTip>
        </div>
        {targets.length > 1 && (
          <Segmented
            aria-label="Hedef fiyat"
            size="sm"
            value={target.value}
            onChange={setSelected}
            options={targets.map((t) => ({ value: t.value, label: t.label }))}
          />
        )}
      </div>
      <p className="tnum mt-1 text-xs text-fg-3">Hedef (eline geçecek): {formatTL(target?.amount ?? 0)}</p>

      {enabled.length === 0 ? (
        <p className="mt-3 text-sm text-fg-3">Etkin kanal yok.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {enabled.map((channel) => {
            const fee = channelFeeInput(channel, settings)
            const r = channelListPrice(target?.amount ?? 0, fee, settings.rounding)
            return (
              <li key={channel.id} className="min-w-0 rounded-[12px] border border-line bg-inset px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{channel.name}</span>
                  {channel.estimated && !channel.lastVerified && (
                    <Badge tone="warning" size="xs" title="Oranları satıcı panelinden doğrula">
                      tahmini
                    </Badge>
                  )}
                  <span className="tnum shrink-0 text-[11px] text-fg-3">{formatPercent(effectiveChannelRate(fee) * 100, 2)}</span>
                </div>
                {r.valid ? (
                  <dl className="tnum mt-1.5 grid grid-cols-3 gap-2 text-xs">
                    <div className="min-w-0">
                      <dt className="text-fg-3">Liste fiyatı</dt>
                      <dd className="truncate text-[15px] font-semibold text-fg">{formatTL(r.rounded, { compactDecimals: true })}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-fg-3">Kesinti</dt>
                      <dd className="truncate font-medium text-fg-2">{formatTL(r.deduction)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-fg-3">Eline geçen</dt>
                      <dd className="truncate font-medium text-fg">{formatTL(r.net)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-danger">
                    <CircleAlert className="size-3.5" /> Efektif oran %100 veya üstü — fiyat hesaplanamaz
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
