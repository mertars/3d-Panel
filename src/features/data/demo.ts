import {
  db,
  EMPTY_PRINT_NOTES,
  getSettings,
  listChannels,
  listFilamentTypes,
  listPrinters,
  newId,
  nextOrderNumber,
  savePrinter,
  type Failure,
  type Order,
  type OrderStatus,
  type PriceHistoryEntry,
  type Product,
  type ProductVariant,
  type SaleSource,
  type Spool,
} from '@/db'
import { draftFromProduct, draftToCostInput, type Catalog } from '@/features/calculator/draft'
import { pricingSettings } from '@/features/calculator/save'
import { itemFromProduct } from '@/features/orders/items'
import { computeCost, computePrices, printerLoad } from '@/lib/pricing'

/**
 * "Örnek verilerle doldur": 12 ürün, 20 sipariş, 6 makara (+ yoksa 1 yazıcı, 2 fire kaydı).
 * Sabit tohumlu rastgelelik — her seferinde aynı tablo. Örnek kayıtlar "örnek" etiketiyle işaretlenir.
 */

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const SPOOLS: { type: string; colorName: string; color: string; brand: string; remaining: number }[] = [
  { type: 'PLA', colorName: 'Kar Beyazı', color: '#F4F4F2', brand: 'Bambu Lab', remaining: 820 },
  { type: 'PLA', colorName: 'Gece Siyahı', color: '#1F1F23', brand: 'Bambu Lab', remaining: 540 },
  { type: 'PLA Matte', colorName: 'Kiremit', color: '#C2502E', brand: 'Bambu Lab', remaining: 130 },
  { type: 'PLA Silk', colorName: 'Altın', color: '#D4AF37', brand: 'Elas', remaining: 660 },
  { type: 'PETG', colorName: 'Buz Mavisi', color: '#7DD3FC', brand: 'Porima', remaining: 910 },
  { type: 'PLA Matte', colorName: 'Adaçayı', color: '#8BA888', brand: 'Bambu Lab', remaining: 380 },
]

interface ProductSeed {
  name: string
  category: string
  tags: string[]
  lines: [number, number, number][] // [makara index, gram, purge]
  hours: number
  units?: number
  labor: number
  extras?: { name: string; amount: number }[]
  source: SaleSource
  manual?: number
  license: Product['license']
  competitor?: number
  variant?: { name: string; lines: [number, number, number][]; hours: number }
}

const PRODUCTS: ProductSeed[] = [
  { name: 'Ejderha anahtarlık', category: 'Anahtarlık', tags: ['hediye'], lines: [[3, 18, 0]], hours: 1.1, units: 6, labor: 3, extras: [{ name: 'Anahtarlık halkası', amount: 4 }], source: 'a', license: 'commercial', competitor: 149 },
  { name: 'Geometrik saksı', category: 'Saksı', tags: ['ev', 'minimal'], lines: [[2, 145, 0]], hours: 6.5, labor: 10, source: 'a', license: 'commercial', competitor: 420, variant: { name: 'Büyük', lines: [[2, 290, 0]], hours: 12 } },
  { name: 'Ay lambası', category: 'Dekorasyon', tags: ['led', 'hediye'], lines: [[0, 210, 0]], hours: 9.5, labor: 20, extras: [{ name: 'LED modül', amount: 85 }], source: 'b', license: 'licensed' },
  { name: 'Kablo düzenleyici (6’lı set)', category: 'Ofis', tags: ['masa'], lines: [[1, 42, 0]], hours: 2.2, units: 6, labor: 2, source: 'a', license: 'commercial' },
  { name: 'Esnek ahtapot', category: 'Oyuncak', tags: ['çocuk'], lines: [[4, 38, 0]], hours: 2.6, units: 2, labor: 5, source: 'a', license: 'unknown' },
  { name: 'Kulaklık standı', category: 'Ofis', tags: ['masa', 'oyun'], lines: [[1, 165, 0]], hours: 7.2, labor: 12, source: 'b', license: 'commercial', competitor: 380 },
  { name: 'Çok renkli kedi figürü', category: 'Figür', tags: ['ams'], lines: [[0, 46, 14], [1, 12, 6], [2, 8, 5]], hours: 5.4, labor: 15, source: 'a', license: 'personal' },
  { name: 'Duvar rafı (2’li)', category: 'Dekorasyon', tags: ['ev'], lines: [[5, 260, 0]], hours: 11, labor: 15, extras: [{ name: 'Vida + dübel', amount: 12 }], source: 'manual', manual: 649, license: 'commercial' },
  { name: 'Bitki etiketi (10’lu)', category: 'Bahçe', tags: ['bahçe'], lines: [[5, 24, 0]], hours: 1.4, units: 10, labor: 4, source: 'a', license: 'commercial' },
  { name: 'Telefon standı', category: 'Aksesuar', tags: ['masa'], lines: [[0, 58, 0]], hours: 2.4, labor: 4, source: 'a', license: 'commercial', competitor: 159 },
  { name: 'Mini vazo (altın)', category: 'Dekorasyon', tags: ['ev', 'hediye'], lines: [[3, 72, 0]], hours: 3.1, labor: 6, source: 'b', license: 'commercial' },
  { name: 'Yedek dişli (özel ölçü)', category: 'Yedek parça', tags: ['petg'], lines: [[4, 26, 0]], hours: 1.8, labor: 10, source: 'manual', manual: 250, license: 'commercial' },
]

// [ürün index, adet][]; durum; kaç gün önce; kanal sırası; ödendi; satıcı kargosu
const ORDERS: { items: [number, number][]; status: OrderStatus; daysAgo: number; channel: number; paid: boolean; ship?: number; discount?: number }[] = [
  { items: [[1, 1]], status: 'delivered', daysAgo: 118, channel: 0, paid: true },
  { items: [[0, 4], [9, 1]], status: 'delivered', daysAgo: 104, channel: 1, paid: true, ship: 55 },
  { items: [[2, 1]], status: 'delivered', daysAgo: 96, channel: 2, paid: true },
  { items: [[5, 1]], status: 'delivered', daysAgo: 88, channel: 0, paid: true },
  { items: [[3, 2]], status: 'delivered', daysAgo: 77, channel: 2, paid: true },
  { items: [[7, 1]], status: 'delivered', daysAgo: 70, channel: 0, paid: true, discount: 49 },
  { items: [[0, 10]], status: 'delivered', daysAgo: 63, channel: 1, paid: true, ship: 60 },
  { items: [[10, 2], [1, 1]], status: 'delivered', daysAgo: 55, channel: 4, paid: true },
  { items: [[8, 3]], status: 'delivered', daysAgo: 47, channel: 0, paid: true },
  { items: [[5, 1], [9, 2]], status: 'delivered', daysAgo: 39, channel: 2, paid: true },
  { items: [[2, 1]], status: 'cancelled', daysAgo: 34, channel: 1, paid: false },
  { items: [[11, 4]], status: 'delivered', daysAgo: 28, channel: 0, paid: true },
  { items: [[1, 2]], status: 'delivered', daysAgo: 22, channel: 2, paid: true },
  { items: [[0, 6], [3, 1]], status: 'delivered', daysAgo: 16, channel: 1, paid: true, ship: 55 },
  { items: [[4, 3]], status: 'delivered', daysAgo: 11, channel: 0, paid: true },
  { items: [[7, 1]], status: 'shipped', daysAgo: 6, channel: 3, paid: true },
  { items: [[10, 1], [9, 1]], status: 'ready', daysAgo: 4, channel: 0, paid: false },
  { items: [[5, 2]], status: 'printing', daysAgo: 2, channel: 2, paid: true },
  { items: [[2, 1], [1, 1]], status: 'new', daysAgo: 1, channel: 1, paid: false },
  { items: [[0, 12]], status: 'new', daysAgo: 0, channel: 0, paid: false },
]

const CUSTOMERS = ['Ayşe Y.', 'Mehmet K.', 'Zeynep A.', 'Can D.', 'Elif Ş.', 'Burak T.', 'Selin Ö.', 'Emre G.', 'Deniz Ç.', 'Ece B.']

export interface DemoResult {
  products: number
  orders: number
  spools: number
}

export async function seedDemoData(now = Date.now()): Promise<DemoResult> {
  const r = rng(42)
  const day = 86400000
  const settings = await getSettings()
  const types = await listFilamentTypes()
  let printers = await listPrinters()
  if (printers.length === 0) {
    await savePrinter({ name: 'Bambu Lab P1S (örnek)', preset: 'p1s', price: 35000, salvageValue: 5000, lifeHours: 5000, watts: 120, maintenancePerHour: 1.5, isDefault: true })
    printers = await listPrinters()
  }
  const printer = printers.find((p) => p.isDefault) ?? printers[0]
  const channels = (await listChannels()).filter((c) => c.enabled)
  const typeId = (name: string) => (types.find((t) => t.name === name) ?? types[0]).id

  const spools: Spool[] = SPOOLS.map((s, i) => {
    const t = types.find((x) => x.id === typeId(s.type))
    return {
      id: newId(),
      filamentTypeId: typeId(s.type),
      brand: s.brand,
      colorName: s.colorName,
      color: s.color,
      spoolPrice: t?.spoolPrice ?? 600,
      spoolGrams: 1000,
      remainingGrams: s.remaining,
      emptySpoolWeight: 250,
      purchaseDate: new Date(now - (90 - i * 12) * day).toISOString().slice(0, 10),
      supplier: i % 2 ? 'Trendyol' : 'Bambu Store',
      note: 'örnek',
      createdAt: now - (90 - i) * day,
    }
  })
  const catalog: Catalog = { filamentTypes: types, spools, printers }
  const ps = pricingSettings(settings)

  const products: Product[] = PRODUCTS.map((seed, i) => {
    const lines = (l: [number, number, number][]) => l.map(([si, gram, purgeGram]) => ({ filamentId: spools[si].id, gram, purgeGram }))
    const created = now - (130 - i * 3) * day
    const variants: ProductVariant[] = seed.variant
      ? [{ id: newId(), name: seed.variant.name, filaments: lines(seed.variant.lines), printHours: seed.variant.hours, unitsPerPlate: 1, laborMinutes: seed.labor, priceOverride: null }]
      : []
    const base: Product = {
      id: newId(),
      name: seed.name,
      category: seed.category,
      tags: [...seed.tags, 'örnek'],
      link: '',
      photo: null,
      mode: 'detailed',
      quick: { cost: 0, printHours: 0 },
      detailed: {
        filaments: lines(seed.lines),
        printHours: seed.hours,
        printerId: printer.id,
        laborMinutes: seed.labor,
        extras: seed.extras ?? [],
        packaging: settings.defaultPackaging,
        unitsPerPlate: seed.units ?? 1,
      },
      manualPrice: seed.manual ?? null,
      saleSource: seed.source,
      salePrice: 0,
      variants,
      printNotes: { ...EMPTY_PRINT_NOTES, layerHeight: 0.2, infillPercent: 15, nozzle: '0.4', plateType: 'Textured PEI', supports: 'Yok' },
      license: seed.license,
      competitorPrice: seed.competitor ?? null,
      competitorNote: seed.competitor ? 'Trendyol, benzer ürün' : '',
      archived: false,
      snapshot: undefined as unknown as Product['snapshot'],
      createdAt: created,
      updatedAt: created + day,
    }
    const cost = computeCost(draftToCostInput(draftFromProduct(base), catalog), ps)
    const prices = computePrices(cost, ps)
    const salePrice = seed.source === 'manual' ? seed.manual! : seed.source === 'b' ? prices.b.rounded : prices.a.rounded
    return { ...base, salePrice, snapshot: { at: created, settings: ps, cost, priceA: prices.a, priceB: prices.b, manual: null } }
  })

  const history: PriceHistoryEntry[] = products.map((p) => ({
    id: newId(),
    productId: p.id,
    at: p.createdAt,
    totalCost: p.snapshot.cost.totalCost,
    priceA: p.snapshot.priceA.rounded,
    priceB: p.snapshot.priceB.rounded,
    manualPrice: p.manualPrice,
    salePrice: p.salePrice,
    reason: 'save',
  }))

  const firstNumber = await nextOrderNumber()
  const prefix = firstNumber.slice(0, firstNumber.lastIndexOf('-') + 1)
  let seq = Number(firstNumber.slice(prefix.length))
  const orders: Order[] = ORDERS.map((seed, i) => {
    const at = now - seed.daysAgo * day - Math.floor(r() * 8) * 3600000
    const items = seed.items.map(([pi, qty]) => itemFromProduct(products[pi], null, qty, catalog, ps))
    const consumes = seed.status !== 'new' && seed.status !== 'cancelled'
    return {
      id: newId(),
      number: `${prefix}${String(seq++).padStart(3, '0')}`,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      contact: '',
      channelId: channels[seed.channel % Math.max(1, channels.length)]?.id ?? null,
      items,
      discount: seed.discount ?? 0,
      shippingPayer: seed.ship ? 'seller' : 'customer',
      shippingCost: seed.ship ?? 0,
      paid: seed.paid,
      dueDate: new Date(at + 5 * day).toISOString().slice(0, 10),
      note: 'örnek',
      status: seed.status,
      quoteId: null,
      // Örnek siparişler stoğu gerçekten düşmez (makaralar yukarıdaki kalanla gelir); yazıcı saati sayılır
      consumption: consumes ? { at, spools: [], missing: [], printers: printerLoad(items) } : null,
      createdAt: at,
      updatedAt: at,
    }
  })

  const failures: Failure[] = [
    { id: newId(), at: now - 50 * day, printerId: printer.id, filamentId: spools[0].id, grams: 64, hours: 2.5, reason: 'adhesion', note: 'örnek', orderId: null, consumption: { at: now - 50 * day, spools: [], missing: [], printers: [{ printerId: printer.id, hours: 2.5, depreciation: 0 }] } },
    { id: newId(), at: now - 9 * day, printerId: printer.id, filamentId: spools[2].id, grams: 38, hours: 1.2, reason: 'spaghetti', note: 'örnek', orderId: null, consumption: { at: now - 9 * day, spools: [], missing: [], printers: [{ printerId: printer.id, hours: 1.2, depreciation: 0 }] } },
  ]

  await db.transaction('rw', [db.spools, db.products, db.priceHistory, db.orders, db.failures], async () => {
    await db.spools.bulkAdd(spools)
    await db.products.bulkAdd(products)
    await db.priceHistory.bulkAdd(history)
    await db.orders.bulkAdd(orders)
    await db.failures.bulkAdd(failures)
  })
  return { products: products.length, orders: orders.length, spools: spools.length }
}

