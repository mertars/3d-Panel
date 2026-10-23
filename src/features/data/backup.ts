import { z } from 'zod'
import { db } from '@/db'

/**
 * JSON yedek: tüm tablolar; Blob alanları (ürün fotoğrafı, logo) data URL olarak gömülür.
 */

export const BACKUP_TABLES = [
  'settings',
  'printers',
  'filamentTypes',
  'spools',
  'channels',
  'products',
  'orders',
  'quotes',
  'priceHistory',
  'failures',
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

const TABLE_LABEL: Record<BackupTable, string> = {
  settings: 'ayar',
  printers: 'yazıcı',
  filamentTypes: 'filament türü',
  spools: 'makara',
  channels: 'kanal',
  products: 'ürün',
  orders: 'sipariş',
  quotes: 'teklif',
  priceHistory: 'fiyat geçmişi kaydı',
  failures: 'fire kaydı',
}

const BLOB_KEY = '__blob'

async function blobToDataUrl(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  // Büyük fotoğraflarda yığın taşmasın diye parça parça
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(bin)}`
}

function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(',', 2)
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(body ?? '')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function encode(v: unknown): Promise<unknown> {
  if (v instanceof Blob) return { [BLOB_KEY]: await blobToDataUrl(v) }
  if (Array.isArray(v)) return Promise.all(v.map(encode))
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = await encode(x)
    return out
  }
  return v
}

function decode(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decode)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o[BLOB_KEY] === 'string' && Object.keys(o).length === 1) return dataUrlToBlob(o[BLOB_KEY] as string)
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(o)) out[k] = decode(x)
    return out
  }
  return v
}

export interface Backup {
  app: 'katman'
  schema: number
  exportedAt: string
  data: Record<BackupTable, unknown[]>
}

const backupSchema = z.object({
  app: z.literal('katman'),
  schema: z.number(),
  exportedAt: z.string(),
  data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
})

export async function createBackup(): Promise<Backup> {
  const data = {} as Record<BackupTable, unknown[]>
  for (const t of BACKUP_TABLES) data[t] = (await encode(await db.table(t).toArray())) as unknown[]
  return { app: 'katman', schema: db.verno, exportedAt: new Date().toISOString(), data }
}

/** Dosya içeriğini doğrular; geçersizse açıklayıcı hata fırlatır */
export function parseBackup(text: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('Dosya JSON değil')
  }
  const res = backupSchema.safeParse(json)
  if (!res.success) throw new Error('Bu bir Katman yedeği değil')
  if (res.data.schema > db.verno) throw new Error('Yedek, uygulamanın daha yeni bir sürümünden — önce uygulamayı güncelle')
  const data = {} as Record<BackupTable, unknown[]>
  for (const t of BACKUP_TABLES) data[t] = res.data.data[t] ?? []
  return { ...res.data, app: 'katman', data }
}

export interface BackupSummaryLine {
  table: BackupTable
  label: string
  count: number
}

export function summarize(b: Backup): BackupSummaryLine[] {
  return BACKUP_TABLES.filter((t) => t !== 'settings')
    .map((t) => ({ table: t, label: TABLE_LABEL[t], count: b.data[t].length }))
    .filter((l) => l.count > 0)
}

/** "42 ürün, 18 sipariş, 6 makara…" */
export const summaryText = (b: Backup) =>
  summarize(b)
    .map((l) => `${l.count} ${l.label}`)
    .join(', ') || 'boş yedek'

/**
 * merge: aynı id'li kayıtlar yedektekiyle değişir, diğerleri kalır; ayarlar korunur.
 * replace: tüm veri silinir, yedek aynen yüklenir (ayarlar dahil).
 */
export async function restoreBackup(b: Backup, mode: 'merge' | 'replace') {
  const tables = BACKUP_TABLES.map((t) => db.table(t))
  await db.transaction('rw', tables, async () => {
    for (const t of BACKUP_TABLES) {
      if (mode === 'merge' && t === 'settings') continue
      const rows = decode(b.data[t]) as Record<string, unknown>[]
      if (mode === 'replace') await db.table(t).clear()
      if (rows.length) await db.table(t).bulkPut(rows)
    }
  })
}
