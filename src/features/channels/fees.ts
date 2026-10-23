import type { AppSettings, Channel } from '@/db'
import type { ChannelFeeInput } from '@/lib/pricing'

/** Kanal kaydını hesaplama motorunun girdisine çevirir (USD sabit ücreti kurla TL'ye) */
export function channelFeeInput(c: Channel, settings: Pick<AppSettings, 'usdRate'>): ChannelFeeInput {
  return {
    commissionPercent: c.commissionPercent,
    fixedFee: c.fixedFeeCurrency === 'USD' ? c.fixedFee * settings.usdRate : c.fixedFee,
    vatOnCommission: c.vatOnCommission,
    extraPercent: c.extraPercents.reduce((s, p) => s + p.percent, 0),
    sellerShipping: c.sellerShipping,
  }
}
