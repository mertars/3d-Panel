// Uçtan uca duman testi + yatay taşma kontrolü.
// Kullanım: npm run build && npx vite preview --port 4173 & node scripts/e2e-check.mjs
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = 'scripts/out'
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440]
const ROUTES = ['/', '/hesapla', '/urunler', '/siparisler', '/teklifler', '/filamentler', '/yazicilar', '/kanallar', '/ayarlar', '/fiyat-listesi']
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const failures = []
const check = (cond, msg) => {
  if (!cond) failures.push(msg)
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
}

/* ── 1) Sihirbaz + referans ürün (masaüstü) ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(BASE + '/hesapla')
  await page.getByRole('dialog', { name: /hoş geldin/i }).waitFor()
  await page.screenshot({ path: `${OUT}/wizard-1440.png` })
  await page.getByRole('radio', { name: /P1S/ }).click()
  await page.locator('#wz-price').fill('35000')
  await page.getByRole('button', { name: 'İleri' }).click()
  await page.locator('#wz-kwh').fill('4')
  await page.getByRole('button', { name: 'İleri' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/wizard-step3-1440.png` })
  await page.getByRole('button', { name: 'Bitir' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })

  // Yazıcıya hurda değeri gir (referans: 5.000 TL)
  await page.getByRole('button', { name: 'Yazıcıyı düzenle' }).click()
  await page.locator('#pr-salvage').fill('5000')
  await page.getByRole('dialog').getByRole('button', { name: 'Kaydet' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })

  await page.locator('#p-name').fill('Referans ürün')
  await page.getByLabel('Filament 1 gram').fill('85')
  await page.locator('#p-hours').fill('4:30')
  await page.locator('#p-labor').fill('15')
  await page.waitForTimeout(600)
  const panel = page.getByRole('complementary', { name: 'Fiyat paneli' })
  const text = (await panel.innerText()).replace(/\s+/g, ' ')
  check(text.includes('309 ₺'), 'Fiyat A ekranda 309 ₺')
  check(text.includes('289 ₺'), 'Fiyat B ekranda 289 ₺')
  check(text.includes('ham 302,97 ₺'), 'Fiyat A ham 302,97 ₺')
  check(text.includes('ham 286,48 ₺'), 'Fiyat B ham 286,48 ₺')
  check(text.includes('151,48 ₺'), 'Taban fiyat 151,48 ₺')
  check(text.includes('339 ₺'), 'Shopier liste fiyatı 339 ₺')
  check(text.includes('369 ₺'), 'Trendyol liste fiyatı 369 ₺')
  await page.screenshot({ path: `${OUT}/hesapla-1440.png`, fullPage: true })

  // Bambu Studio biçimi yapıştırma
  await page.locator('#p-hours').fill('1h 23m')
  await page.waitForTimeout(100)
  check((await page.locator('#p-hours').locator('..').locator('..').innerText()).includes('1 sa 23 dk'), '“1h 23m” → 1 sa 23 dk')
  await page.locator('#p-hours').fill('4,5')

  await page.getByRole('button', { name: /^Kaydet$/ }).click()
  await page.getByText('“Referans ürün” kaydedildi').waitFor()
  check(true, 'Ürün kaydedildi (toast)')

  // Hızlı mod
  await page.getByRole('radio', { name: 'Hızlı' }).click()
  await page.locator('#q-cost').fill('151,48')
  await page.locator('#q-hours').fill('4.5')
  await page.waitForTimeout(600)
  const quick = (await panel.innerText()).replace(/\s+/g, ' ')
  check(quick.includes('309 ₺') && quick.includes('289 ₺'), 'Hızlı mod: 309 ₺ / 289 ₺')
  await page.getByRole('radio', { name: 'Detaylı' }).click()

  // Ayarlar sayfası ve komut paleti
  await page.goto(BASE + '/ayarlar')
  await page.getByText('Fiyatlandırma').first().waitFor()
  await page.screenshot({ path: `${OUT}/ayarlar-1440.png`, fullPage: true })
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Ara' }).fill('referans')
  check(await page.getByRole('option', { name: /Referans ürün/ }).isVisible(), 'Komut paletinde kayıtlı ürün bulunuyor')
  await page.keyboard.press('Enter')
  await page.waitForURL('**/urunler/*')
  check(await page.getByRole('heading', { name: 'Referans ürün', exact: true }).waitFor({ timeout: 8000 }).then(() => true, () => false), 'Komut paletinden ürün detayı açıldı')

  /* ── Parça 2 ── */
  const productUrl = page.url()
  const mainText = async () => (await page.locator('main').innerText()).replace(/\s+/g, ' ')

  // Ürünler listesi
  await page.goto(BASE + '/urunler')
  await page.getByRole('link', { name: 'Referans ürün detayı' }).waitFor()
  let t = await mainText()
  check(t.includes('Referans ürün') && t.includes('309 ₺') && t.includes('marj'), 'Ürünler: kart, satış fiyatı ve marj rozeti')
  check(t.includes('Lisans bilinmiyor'), 'Ürünler: lisans bilinmiyor uyarısı')
  await page.screenshot({ path: `${OUT}/urunler-1440.png`, fullPage: true })
  await page.getByRole('radio', { name: 'Liste' }).click()
  await page.screenshot({ path: `${OUT}/urunler-liste-1440.png` })
  await page.getByRole('radio', { name: 'Izgara' }).click()

  // Detay: rakip, toplu tablo, varyant
  await page.goto(productUrl)
  await page.locator('#pd-comp').waitFor()
  await page.locator('#pd-comp').fill('350')
  await page.waitForTimeout(400)
  t = await mainText()
  check(t.includes('Rakipten %11,7 ucuz'), 'Detay: rakip konumu (%11,7 ucuz)')
  check(t.includes('50 adet') && t.includes('247,20 ₺'), 'Detay: toplu adet tablosu (50 adet 247,20 ₺)')
  check(t.includes('Taban') || t.includes('Hesap dökümü'), 'Detay: hesap dökümü')
  await page.getByRole('button', { name: 'Ekle', exact: true }).first().click()
  await page.locator('#v-name').fill('Büyük')
  await page.getByLabel('Varyant filament 1 gram').fill('170')
  await page.locator('#v-hours').fill('9')
  await page.waitForTimeout(300)
  const vdlg = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ')
  check(vdlg.includes('242,97 ₺') && vdlg.includes('489 ₺'), 'Varyant önizleme: maliyet 242,97 ₺, A 489 ₺')
  await page.getByRole('dialog').getByRole('button', { name: 'Kaydet' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  check((await mainText()).includes('Büyük'), 'Varyant kaydedildi')
  await page.screenshot({ path: `${OUT}/urun-detay-1440.png`, fullPage: true })

  // Eskimiş fiyat: PLA makara fiyatı 600 → 900
  await page.goto(BASE + '/filamentler')
  await page.getByRole('tab', { name: 'Türler' }).click()
  await page.getByLabel('PLA makara fiyatı', { exact: true }).fill('900')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(400)
  await page.goto(BASE + '/urunler')
  await page.getByText('1 ürünün fiyatı güncel maliyetin gerisinde').waitFor()
  check(true, 'Eskimiş fiyat şeridi: “1 ürünün fiyatı güncel maliyetin gerisinde”')
  await page.getByRole('button', { name: 'İncele' }).click()
  const sdlg = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ')
  check(sdlg.includes('309 ₺') && sdlg.includes('359 ₺'), 'Eski/yeni karşılaştırma: 309 → 359 ₺')
  await page.screenshot({ path: `${OUT}/eskimis-1440.png` })
  await page.getByRole('button', { name: 'Tümüne yeni fiyatı uygula' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.waitForTimeout(300)
  check(!(await mainText()).includes('gerisinde'), 'Yeni fiyat uygulandı, şerit kalktı')
  await page.goto(productUrl)
  await page.getByText('Satış fiyatı', { exact: true }).waitFor()
  await page.waitForTimeout(500)
  t = await mainText()
  check(t.includes('359 ₺'), 'Detay: satış fiyatı 359 ₺')
  check((await page.locator('.recharts-line').count()) === 2, 'Fiyat geçmişi grafiği (2 seri)')

  // Makara: ekle + tartarak güncelle
  await page.goto(BASE + '/filamentler')
  await page.getByRole('button', { name: 'Makara ekle' }).first().click()
  await page.locator('#sp-cname').fill('Mat Kiremit')
  await page.locator('#sp-hex').fill('#C2502E')
  await page.locator('#sp-rem').fill('120')
  await page.getByRole('dialog').getByRole('button', { name: 'Kaydet' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  check((await mainText()).includes('düşük stok'), 'Makara: 120 g → düşük stok rozeti')
  await page.getByRole('button', { name: 'Tartarak güncelle' }).click()
  await page.locator('#w-total').fill('1050')
  await page.locator('#w-empty').fill('250')
  await page.getByRole('button', { name: 'Kalanı güncelle' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  t = await mainText()
  check(t.includes('800 g kaldı') && !t.includes('düşük stok'), 'Tartarak güncelle: 1050 − 250 = 800 g')
  await page.screenshot({ path: `${OUT}/filamentler-1440.png`, fullPage: true })

  // Yazıcılar ve kanallar
  await page.goto(BASE + '/yazicilar')
  await page.getByText('ödedi').first().waitFor()
  check((await mainText()).includes('%0'), 'Yazıcılar: amortisman halkası (%0, sipariş yok)')
  await page.screenshot({ path: `${OUT}/yazicilar-1440.png`, fullPage: true })
  await page.goto(BASE + '/kanallar')
  await page.getByRole('button', { name: 'Kanal ekle' }).click()
  await page.waitForTimeout(300)
  check((await page.getByLabel('Kanal adı').count()) === 7, 'Kanallar: yeni kanal eklendi (7 kanal)')
  await page.screenshot({ path: `${OUT}/kanallar-1440.png` })

  // Teklif: ürün detayından
  await page.goto(productUrl)
  await page.getByRole('button', { name: 'Teklif', exact: true }).click()
  await page.waitForURL('**/teklifler/*')
  const quoteUrl = page.url()
  await page.locator('#q-customer').fill('Ayşe Yılmaz')
  await page.getByLabel('Kalem 1 adet').fill('10')
  await page.locator('#q-note').fill('Kargo alıcıya aittir.')
  await page.waitForTimeout(700)
  const card = (await page.locator('.quote-card').innerText()).replace(/\s+/g, ' ')
  check(card.includes('Ayşe Yılmaz') && card.includes('323,10 ₺') && card.includes('3.231,00 ₺'), 'Teklif kartı: 10 adet × 323,10 ₺ = 3.231,00 ₺ (%10 indirim)')
  check(!/maliyet|kâr|marj/i.test(card), 'Teklif kartında maliyet/kâr yok')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG indir' }).click()])
  const pngPath = `${OUT}/teklif.png`
  await download.saveAs(pngPath)
  const { statSync } = await import('node:fs')
  check(download.suggestedFilename().endsWith('.png') && statSync(pngPath).size > 20000, `PNG indirildi (${download.suggestedFilename()}, ${statSync(pngPath).size} bayt)`)
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Metni kopyala' }).click()
  await page.waitForTimeout(200)
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  check(clip.includes('Sayın Ayşe Yılmaz') && clip.includes('Toplam: 3.231,00') && !/maliyet|kâr/i.test(clip), 'Metin kopyalandı (WhatsApp formatı, maliyet yok)')
  await page.screenshot({ path: `${OUT}/teklif-1440.png`, fullPage: true })
  await page.emulateMedia({ media: 'print' })
  check(!(await page.locator('aside').first().isVisible()) && !(await page.locator('#q-customer').isVisible()), 'Yazdırma görünümü: yalnızca teklif kartı')
  await page.screenshot({ path: `${OUT}/teklif-print.png`, fullPage: true })
  await page.emulateMedia({ media: 'screen' })
  await page.goto(BASE + '/teklifler')
  check(await page.getByText('Ayşe Yılmaz').first().waitFor({ timeout: 8000 }).then(() => true, () => false), 'Teklif listesinde görünüyor')

  /* ── Parça 3 ── */
  const ok = (p) => p.then(() => true, () => false)

  // Kabul edilen teklif → sipariş
  await page.goto(quoteUrl)
  await page.getByRole('radio', { name: 'Kabul' }).click()
  await page.getByRole('button', { name: 'Siparişe dönüştür' }).click()
  await page.waitForURL('**/siparisler/*')
  const orderUrl = page.url()
  await page.getByText('Sipariş özeti').waitFor()
  await page.waitForTimeout(400)
  t = await mainText()
  check((await page.locator('#o-customer').inputValue()) === 'Ayşe Yılmaz' && t.includes('3.231,00 ₺'), 'Tekliften sipariş: müşteri ve ciro (3.231,00 ₺) aktarıldı')
  check(t.includes('yetmiyor'), 'Filament yeter mi: 850 g gerekli, 800 g stok → kırmızı “yetmiyor”')
  await page.screenshot({ path: `${OUT}/siparis-1440.png`, fullPage: true })

  // Kanban: sürükle-bırak → Baskıda (stok düşer)
  await page.goto(BASE + '/siparisler')
  await page.getByRole('region', { name: /Sipariş panosu/ }).waitFor()
  const orderCard = page.locator('section[aria-label="Yeni"] article').first()
  await orderCard.dragTo(page.locator('section[aria-label="Baskıda"]'), { targetPosition: { x: 100, y: 60 } })
  check(await ok(page.getByText(/→ Baskıda · filament stoktan düşüldü/).first().waitFor({ timeout: 5000 })), 'Sürükle-bırak: Baskıda + “filament stoktan düşüldü”')
  check(await ok(page.getByText(/stokta 50 g eksik/).first().waitFor({ timeout: 3000 })), 'Eksik stok bildirildi (50 g)')
  await page.screenshot({ path: `${OUT}/siparisler-kanban-1440.png`, fullPage: true })
  await page.goto(BASE + '/filamentler')
  await page.getByText('Mat Kiremit').waitFor()
  check((await mainText()).includes('0 g kaldı'), 'Makara stoğu düştü (800 g → 0 g)')
  await page.goto(BASE + '/yazicilar')
  await page.getByText('ödedi').first().waitFor()
  t = await mainText()
  check(!t.includes('Toplam basılan 0 sa'), 'Yazıcı saat sayacı arttı')
  // Menüden Yeni'ye geri al → stok iade
  await page.goto(BASE + '/siparisler')
  await page.locator('section[aria-label="Baskıda"] article').first().getByRole('button', { name: /durumunu değiştir/ }).click()
  await page.getByRole('menuitem', { name: '→ Yeni' }).click()
  check(await ok(page.getByText(/→ Yeni · filament stoğa iade edildi/).first().waitFor({ timeout: 5000 })), 'Yeni’ye dönünce stok iade edildi')
  await page.goto(BASE + '/filamentler')
  await page.getByText('Mat Kiremit').waitFor()
  check((await mainText()).includes('800 g kaldı'), 'Makara geri 800 g')

  // Fire kaydı + gerçek fire oranı uyarısı
  await page.goto(BASE + '/siparisler')
  await page.getByRole('button', { name: 'Fire kaydet' }).click()
  await page.locator('#fl-grams').fill('40')
  await page.locator('#fl-hours').fill('1:30')
  await page.getByRole('dialog').getByRole('button', { name: 'Kaydet' }).click()
  check(await ok(page.getByText(/Fire kaydedildi · 40 g stoktan düşüldü/).waitFor({ timeout: 5000 })), 'Fire kaydı stoktan düştü')
  check(await ok(page.getByText(/Gerçek fire oranın/).waitFor({ timeout: 5000 })), 'Gerçek fire oranı uyarısı göründü')

  // Panel
  await page.goto(BASE + '/')
  check(await ok(page.getByText('Aylık ciro ve net kâr').waitFor({ timeout: 8000 })), 'Panel: grafikler ve kartlar')
  t = await mainText()
  check(t.includes('Kapasite') && t.includes('Başa baş') && t.includes('Bekleyen siparişler'), 'Panel: kapasite, başa baş, bekleyen siparişler')
  for (const r of ['Geçen ay', 'Son 90 gün', 'Bu yıl', 'Özel', 'Bu ay']) await page.getByRole('radio', { name: r }).click()
  check(true, 'Panel: tarih aralıkları değişti (hata yok)')
  await page.screenshot({ path: `${OUT}/panel-1440.png`, fullPage: true })

  // Fiyat listesi (hikâye PNG 1080×1920)
  await page.goto(BASE + '/fiyat-listesi')
  await page.locator('.pricelist-sheet').waitFor()
  check((await page.locator('.pricelist-sheet').innerText()).includes('Referans ürün'), 'Fiyat listesi: ürün listelendi')
  await page.getByRole('radio', { name: /Hikâye/ }).click()
  const [plDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG indir' }).click()])
  await plDl.saveAs(`${OUT}/fiyat-hikaye.png`)
  const { readFileSync } = await import('node:fs')
  const plBuf = readFileSync(`${OUT}/fiyat-hikaye.png`)
  check(plBuf.readUInt32BE(16) === 1080 && plBuf.readUInt32BE(20) === 1920, 'Hikâye PNG 1080×1920')

  // Kısayollar: / sayfa araması, N yeni ürün
  await page.goto(BASE + '/urunler')
  await page.getByRole('link', { name: /detayı$/ }).first().waitFor()
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('/')
  check(await page.evaluate(() => document.activeElement?.hasAttribute('data-page-search') ?? false), '“/” sayfa aramasına odaklandı')
  await page.keyboard.press('Escape')
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
  await page.keyboard.press('n')
  check(await ok(page.waitForURL('**/hesapla', { timeout: 5000 })), '“N” yeni ürün (Hesapla) açtı')

  // Yedek: JSON dışa aktar → içe aktar (birleştir), CSV
  await page.goto(BASE + '/ayarlar#veri')
  await page.getByRole('button', { name: 'Yedek indir (JSON)' }).waitFor()
  const [jsonDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Yedek indir (JSON)' }).click()])
  const jsonPath = `${OUT}/yedek.json`
  await jsonDl.saveAs(jsonPath)
  const backup = JSON.parse(readFileSync(jsonPath, 'utf8'))
  check(backup.app === 'katman' && backup.data.products.length >= 1 && backup.data.orders.length >= 1, `JSON yedek: ${backup.data.products.length} ürün, ${backup.data.orders.length} sipariş, ${backup.data.spools.length} makara`)
  check(await ok(page.getByText(/Son yedek: (az önce|şimdi|\d+ dakika önce)/).waitFor({ timeout: 5000 })), '“Son yedek” bilgisi güncellendi')
  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ürünler CSV' }).click()])
  await csvDl.saveAs(`${OUT}/urunler.csv`)
  const csv = readFileSync(`${OUT}/urunler.csv`, 'utf8')
  check(csv.charCodeAt(0) === 0xfeff && csv.includes('Ad;Kategori;') && csv.includes('Referans ürün;'), 'Ürünler CSV: UTF-8 BOM + “;” ayırıcı + Türkçe karakter')
  const [csv2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Siparişler CSV' }).click()])
  await csv2.saveAs(`${OUT}/siparisler.csv`)
  check(readFileSync(`${OUT}/siparisler.csv`, 'utf8').includes('Ayşe Yılmaz'), 'Siparişler CSV')
  await page.locator('input[type=file][accept*="json"]').setInputFiles(jsonPath)
  const impDlg = page.getByRole('dialog', { name: 'Yedekten geri yükle' })
  await impDlg.waitFor()
  check((await impDlg.innerText()).includes('ürün'), 'İçe aktarmadan önce özet gösterildi')
  await impDlg.getByRole('button', { name: 'Birleştir' }).last().click()
  check(await ok(page.getByText('Yedek mevcut veriyle birleştirildi').waitFor({ timeout: 5000 })), 'Yedek birleştirildi')

  // Veri dolu sayfalarda taşma (aynı bağlam, farklı genişlikler)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 860 })
    for (const route of ['/', '/hesapla', '/urunler', productUrl.replace(BASE, ''), '/siparisler', orderUrl.replace(BASE, ''), '/filamentler', '/yazicilar', '/kanallar', '/teklifler', quoteUrl.replace(BASE, ''), '/fiyat-listesi', '/ayarlar']) {
      await page.goto(BASE + route)
      await page.waitForTimeout(450)
      const sw = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
      check(sw <= width, `${width}px ${route.length > 20 ? route.slice(0, 20) + '…' : route} (veri dolu): scrollWidth ${sw} ≤ ${width}`)
      if (width === 360) await page.screenshot({ path: `${OUT}/p2-360${route.replace(/\//g, '_').slice(0, 30)}.png`, fullPage: true })
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })

  // Açık tema ekran görüntüsü
  await page.evaluate(() => (document.documentElement.dataset.theme = 'light'))
  await page.screenshot({ path: `${OUT}/hesapla-1440-light.png` })
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))

  // Açık temada da taşma ve görüntü
  await page.goto(BASE + '/')
  await page.evaluate(() => (document.documentElement.dataset.theme = 'light'))
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/panel-1440-light.png`, fullPage: true })
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))

  check(errors.length === 0, `Konsol hatası yok${errors.length ? ': ' + errors.join(' | ') : ''}`)

  // Tüm veriyi sil — çift onay
  await page.goto(BASE + '/ayarlar#veri')
  await page.getByRole('button', { name: 'Tüm veriyi sil' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Devam' }).click()
  const wipe = page.getByRole('dialog', { name: 'Son onay' })
  await wipe.waitFor()
  check(await wipe.getByRole('button', { name: /Kalıcı olarak sil/ }).isDisabled(), 'Silme: “SİL” yazılmadan buton kapalı')
  await page.locator('#wipe-confirm').fill('sil')
  await wipe.getByRole('button', { name: /Kalıcı olarak sil/ }).click()
  await page.waitForURL(BASE + '/')
  check(await ok(page.getByRole('dialog', { name: /hoş geldin/i }).waitFor({ timeout: 8000 })), 'Tüm veri silindi → ilk açılış sihirbazı geri geldi')
  await ctx.close()
}

/* ── 2) Yatay taşma: tüm genişlik × tüm sayfalar ── */
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 860 },
    isMobile: width < 1024,
    hasTouch: width < 1024,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  // Sihirbazı geç (onboarded) — ilk ziyarette kapat
  await page.goto(BASE + '/')
  const wiz = page.getByRole('button', { name: 'Atla' })
  await wiz.waitFor({ timeout: 5000 })
  await wiz.click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  for (const route of ROUTES) {
    await page.goto(BASE + route)
    await page.waitForTimeout(350)
    const { sw, cw } = await page.evaluate(() => ({
      sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      cw: document.documentElement.clientWidth,
    }))
    check(sw <= cw, `${width}px ${route}: scrollWidth ${sw} ≤ ${cw}`)
  }
  // Hesapla: dolu form + açık sheet/panel
  await page.goto(BASE + '/hesapla')
  await page.locator('#p-name').fill('Çok uzun bir ürün adı — ejderha figürlü, çok renkli, AMS ile basılmış dekoratif saksı')
  await page.getByRole('button', { name: 'Satır ekle' }).click()
  await page.getByRole('button', { name: 'Ek parça ekle' }).click()
  await page.waitForTimeout(300)
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth)
  check(sw2 <= width, `${width}px /hesapla (dolu form): scrollWidth ${sw2} ≤ ${width}`)
  await page.screenshot({ path: `${OUT}/hesapla-${width}.png`, fullPage: false })
  const bar = page.getByRole('button', { name: /Fiyat panelini aç/ })
  if (await bar.isVisible().catch(() => false)) {
    await bar.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/hesapla-sheet-${width}.png` })
    const sheetOverflow = await page.evaluate(() => {
      const d = document.querySelector('[role=dialog]')
      return d ? d.scrollWidth - d.clientWidth : 0
    })
    check(sheetOverflow <= 0, `${width}px fiyat sheet’i taşmıyor (${sheetOverflow})`)
    await page.keyboard.press('Escape')
  }
  if (width === 360 || width === 1440) {
    await page.goto(BASE + '/ayarlar')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/ayarlar-${width}.png`, fullPage: true })
  }
  // Dokunma hedefleri: mobilde görünür buton/link/input ≥ 44px yükseklik
  if (width === 360) {
    await page.goto(BASE + '/hesapla')
    await page.locator('#p-name').waitFor()
    await page.waitForTimeout(300)
    // InfoTip (ⓘ) görsel olarak 20px ama ::before ile 44px dokunma alanı var; sr-only öğeler hariç
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input, [role=radio]')]
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { id: el.id, label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), sr: !!el.closest('.sr-only') || el.classList.contains('sr-only') }
        })
        .filter((x) => x.w > 1 && !x.sr && x.label !== 'Açıklama' && x.id !== 'p-tags' /* kapsayıcısı 44px ve tıklanabilir */ && (x.w < 44 || x.h < 44)),
    )
    check(small.length === 0, `360px dokunma hedefleri ≥ 44px ${small.length ? JSON.stringify(small) : ''}`)
  }
  await ctx.close()
}

/* ── 3) PWA: service worker + çevrimdışı açılış ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/')
  const swOk = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    await navigator.serviceWorker.ready
    return true
  })
  check(swOk, 'Service worker kuruldu')
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]')?.getAttribute('href')
    return href ? (await fetch(href)).json() : null
  })
  check(!!manifest && manifest.name.startsWith('Katman') && manifest.icons.some((i) => i.purpose === 'maskable') && manifest.display === 'standalone', 'Web manifest: ad, ikonlar (maskable dahil), standalone')
  await page.reload()
  await page.waitForTimeout(1500)
  await ctx.setOffline(true)
  await page.goto(BASE + '/hesapla').catch(() => {})
  check(await page.getByRole('heading', { name: 'Hesapla' }).first().isVisible().catch(() => false), 'Çevrimdışı: uygulama açıldı (/hesapla)')
  const notif = await page.evaluate(() => (typeof Notification === 'undefined' ? 'yok' : Notification.permission))
  check(notif !== 'granted', `Bildirim izni istenmedi (durum: ${notif})`)
  await ctx.close()
}

/* ── 4) iPhone emülasyonu (Chromium — gerçek Safari değil) ── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  await page.goto(BASE + '/')
  await page.getByRole('button', { name: 'Atla' }).click()
  await page.goto(BASE + '/hesapla')
  await page.locator('#p-name').waitFor()
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => el.getBoundingClientRect().width > 1)
      .map((el) => parseFloat(getComputedStyle(el).fontSize))
      .filter((fs) => fs < 16),
  )
  check(small.length === 0, `iPhone: tüm form alanları ≥16px (zoom yok) ${small.length ? JSON.stringify(small) : ''}`)
  const nav = await page.evaluate(() => {
    const n = document.querySelector('nav[aria-label="Ana menü"].fixed') ?? [...document.querySelectorAll('nav')].find((x) => getComputedStyle(x).position === 'fixed')
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { pos: getComputedStyle(n).position, bottomGap: Math.round(window.innerHeight - r.bottom), pb: getComputedStyle(n).paddingBottom }
  })
  check(!!nav && nav.pos === 'fixed' && nav.bottomGap === 0, `iPhone: alt sekme çubuğu sabit ve en altta ${JSON.stringify(nav)}`)
  const vh = await page.evaluate(() => [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules].map((r) => r.cssText) } catch { return [] } }).some((t) => /\b100vh\b/.test(t)))
  check(!vh, 'CSS’te 100vh kullanılmıyor (100dvh)')
  await page.screenshot({ path: `${OUT}/iphone-hesapla.png` })
  await ctx.close()
}

await browser.close()
console.log(failures.length ? `\n${failures.length} HATA` : '\nTÜM KONTROLLER GEÇTİ')
process.exit(failures.length ? 1 : 0)
