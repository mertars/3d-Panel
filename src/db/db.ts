import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_SETTINGS, defaultChannels, defaultFilamentTypes } from './defaults'
import type {
  AppSettings,
  Channel,
  FilamentType,
  Order,
  PriceHistoryEntry,
  Printer,
  Product,
  Quote,
  Spool,
} from './types'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export class KatmanDB extends Dexie {
  settings!: EntityTable<AppSettings, 'id'>
  printers!: EntityTable<Printer, 'id'>
  filamentTypes!: EntityTable<FilamentType, 'id'>
  spools!: EntityTable<Spool, 'id'>
  channels!: EntityTable<Channel, 'id'>
  products!: EntityTable<Product, 'id'>
  orders!: EntityTable<Order, 'id'>
  quotes!: EntityTable<Quote, 'id'>
  priceHistory!: EntityTable<PriceHistoryEntry, 'id'>

  constructor(name = 'katman') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      printers: 'id, createdAt',
      filamentTypes: 'id, order',
      spools: 'id, filamentTypeId, createdAt',
      channels: 'id, order',
      products: 'id, name, category, updatedAt, *tags',
      orders: 'id, productId, channelId, status, createdAt',
      quotes: 'id, productId, createdAt',
      priceHistory: 'id, productId, at',
    })

    // İlk açılışta varsayılan verilerle tohumla
    this.on('populate', (tx) => {
      tx.table('settings').add({ ...DEFAULT_SETTINGS, updatedAt: Date.now() })
      tx.table('filamentTypes').bulkAdd(defaultFilamentTypes(newId))
      tx.table('channels').bulkAdd(defaultChannels(newId))
    })
  }
}

export const db = new KatmanDB()
