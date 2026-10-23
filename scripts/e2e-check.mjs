// Uçtan uca duman testi + yatay taşma kontrolü.
// Kullanım: npm run build && npx vite preview --port 4173 & node scripts/e2e-check.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = 'scripts/out'
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440]
const ROUTES = ['/', '/hesapla', '/urunler', '/siparisler', '/teklifler', '/filamentler', '/yazicilar', '/kanallar', '/ayarlar']
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

  // Veri dolu sayfalarda taşma (aynı bağlam, farklı genişlikler)
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 860 })
    for (const route of ['/urunler', productUrl.replace(BASE, ''), '/filamentler', '/yazicilar', '/kanallar', '/teklifler', quoteUrl.replace(BASE, ''), '/ayarlar']) {
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

  check(errors.length === 0, `Konsol hatası yok${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await ctx.storageState({ path: `${OUT}/state.json` })
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

await browser.close()
console.log(failures.length ? `\n${failures.length} HATA` : '\nTÜM KONTROLLER GEÇTİ')
process.exit(failures.length ? 1 : 0)
