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
  await page.waitForURL('**/hesapla')
  check((await page.locator('#p-name').inputValue()) === 'Referans ürün', 'Ürün Hesapla’da açıldı')

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
