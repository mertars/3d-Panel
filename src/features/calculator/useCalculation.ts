import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { listChannels, listFilamentTypes, listPrinters, listSpools, type Channel } from '@/db'
import { channelFeeInput } from '@/features/channels/fees'
import {
  channelListPrice,
  computeCost,
  computePrices,
  costSlices,
  evaluatePrice,
  type ChannelPriceResult,
  type CostBreakdown,
  type CostSlice,
  type PriceResult,
  type PriceSet,
} from '@/lib/pricing'
import { useSettings } from '@/store/settings'
import { draftToCostInput, draftWarnings, type Catalog } from './draft'
import { useCalculator } from './store'

const EMPTY: never[] = []

/** Hesapla ekranındaki katalog verileri (canlı) */
export function useCatalog(): Catalog & { channels: Channel[]; loaded: boolean } {
  const filamentTypes = useLiveQuery(listFilamentTypes, [])
  const spools = useLiveQuery(listSpools, [])
  const printers = useLiveQuery(listPrinters, [])
  const channels = useLiveQuery(listChannels, [])
  return useMemo(
    () => ({
      filamentTypes: filamentTypes ?? EMPTY,
      spools: spools ?? EMPTY,
      printers: printers ?? EMPTY,
      channels: channels ?? EMPTY,
      loaded: !!(filamentTypes && spools && printers && channels),
    }),
    [filamentTypes, spools, printers, channels],
  )
}

export type ChannelTarget = 'a' | 'b' | 'manual'

export interface ChannelRow {
  channel: Channel
  result: ChannelPriceResult
}

export interface Calculation {
  cost: CostBreakdown
  prices: PriceSet
  manual: PriceResult | null
  slices: CostSlice[]
  warnings: string[]
}

export function useCalculation(catalog: Catalog): Calculation {
  const draft = useCalculator((s) => s.draft)
  const settings = useSettings()
  return useMemo(() => {
    const cost = computeCost(draftToCostInput(draft, catalog), settings)
    const prices = computePrices(cost, settings)
    // Manuel fiyat kullanıcı tarafından belirlenir; yuvarlama uygulanmaz
    const manual =
      draft.manualPrice !== null && draft.manualPrice > 0
        ? evaluatePrice(draft.manualPrice, cost, { ...settings, rounding: 'none' })
        : null
    return { cost, prices, manual, slices: costSlices(cost), warnings: draftWarnings(draft, catalog) }
  }, [draft, catalog, settings])
}

export function channelRows(channels: Channel[], target: number, settings: ReturnType<typeof useSettings>): ChannelRow[] {
  return channels
    .filter((c) => c.enabled)
    .map((channel) => ({ channel, result: channelListPrice(target, channelFeeInput(channel, settings), settings.rounding) }))
}
