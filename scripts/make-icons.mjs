// public/icons/icon.svg → PWA PNG ikonları (Chromium ile çizilir). Kullanım: node scripts/make-icons.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icons/icon.svg', 'utf8')
const targets = [
  { file: 'public/icons/icon-192.png', size: 192, pad: 0, radius: 0 },
  { file: 'public/icons/icon-512.png', size: 512, pad: 0, radius: 0 },
  // maskable: önemli içerik %80 güvenli alanda kalsın
  { file: 'public/icons/maskable-512.png', size: 512, pad: 0.1, radius: 0 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, pad: 0, radius: 0 },
]
const browser = await chromium.launch()
const page = await browser.newPage()
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size })
  const inner = Math.round(t.size * (1 - t.pad * 2))
  await page.setContent(
    `<html><body style="margin:0;background:#07070B;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  )
  await page.screenshot({ path: t.file, omitBackground: false })
  console.log('✓', t.file)
}
await browser.close()
