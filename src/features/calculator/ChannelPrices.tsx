import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { Badge, InfoTip, Segmented } from '@/components/ui'
import type { Channel } from '@/db'
import { formatPercent, formatTL } from '@/lib/format'
import { effectiveChannelRate, type PriceSet, type PriceResult } from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { channelFeeInput } from '@/features/channels/fees'
import { channelRows, type ChannelTarget } from './useCalculation'

interface ChannelPricesProps {
  channels: Channel[]
  prices: PriceSet
  manual: PriceResult | null
}

/**
 * Satış kanalı fiyatları (tersine hesap): seçilen hedef tutarın eline geçmesi için
 * her kanalda listelemen gereken fiyat. Tablo yerine liste — dar ekranda taşmaz.
 */
export function ChannelPrices({ channels, prices, manual }: ChannelPricesProps) {
  const settings = useSettings()
  const [target, setTarget] = useState<ChannelTarget>('a')
  const effective: ChannelTarget = target === 'manual' && !manual ? 'a' : target
  const targetValue = effective === 'a' ? prices.a.rounded : effective === 'b' ? prices.b.rounded : manual!.raw
  const rows = channelRows(channels, targetValue, settings)

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">Kanal fiyatları</h3>
          <InfoTip>
            Hedef tutarın (A, B veya manuel) eline geçmesi için her kanalda listelemen gereken fiyat. Komisyon, sabit
            ücret ve varsa komisyon KDV’si dahil. Oranları satıcı panelinden doğrula.
          </InfoTip>
        </div>
        <Segmented
          aria-label="Hedef fiyat"
          size="sm"
          value={effective}
          onChange={setTarget}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            ...(manual ? [{ value: 'manual' as const, label: 'Manuel' }] : []),
          ]}
        />
      </div>
      <p className="tnum mt-1 text-xs text-fg-3">Eline geçecek: {formatTL(targetValue)}</p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-fg-3">Etkin kanal yok.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[14px] border border-line">
          {rows.map(({ channel, result }) => (
            <li key={channel.id} className="flex min-w-0 items-center gap-3 bg-inset px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-fg">{channel.name}</span>
                  {channel.estimated && !channel.lastVerified && (
                    <Badge tone="warning" size="xs" title="Oranları satıcı panelinden doğrula">
                      tahmini
                    </Badge>
                  )}
                </div>
                <div className="tnum truncate text-[11px] text-fg-3">
                  {formatPercent(effectiveChannelRate(channelFeeInput(channel, settings)) * 100, 2)}
                  {result.valid && result.deduction > 0 && ` · kesinti ${formatTL(result.deduction)}`}
                </div>
              </div>
              {result.valid ? (
                <div className="shrink-0 text-right">
                  <div className="tnum text-[15px] font-semibold text-fg">{formatTL(result.rounded, { compactDecimals: true })}</div>
                  {settings.rounding !== 'none' && Math.abs(result.raw - result.rounded) > 0.004 && (
                    <div className="tnum text-[11px] text-fg-3">ham {formatTL(result.raw)}</div>
                  )}
                </div>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs text-danger">
                  <CircleAlert className="size-3.5" /> oran ≥ %100
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
