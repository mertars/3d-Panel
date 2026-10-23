# Katman — 3D Baskı Fiyat & İşletme Paneli

Bir 3D baskı atölyesi için fiyatlandırma ve işletme paneli. Her ürün için iki fiyat önerir:

- **Fiyat A — maliyet oranlı:** toplam maliyet × maliyet çarpanı
- **Fiyat B — saat oranlı:** toplam maliyet + adet başı baskı saati × saatlik kâr ücreti

Tüm veriler tarayıcıda (IndexedDB) saklanır; sunucu yoktur. Tam şartname: [`docs/SPEC.md`](docs/SPEC.md).

## Durum

**Parça 1 tamam:** altyapı, tasarım sistemi, hesaplama motoru + testler, Dexie şeması ve tohum verileri, ilk açılış sihirbazı, Ayarlar ve Hesapla ekranları. Panel, Ürünler, Siparişler, Teklifler, Filamentler, Yazıcılar ve Kanallar sayfaları şimdilik "yakında" boş durumu gösterir (Parça 2–3).

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest — hesaplama motoru ve ayrıştırıcı testleri
npm run build      # tsc -b && vite build → dist/
```

Uçtan uca duman testi + yatay taşma kontrolü (Playwright, yüklü Chromium ile):

```bash
npm run build && npx vite preview --port 4173 &
node scripts/e2e-check.mjs   # ekran görüntüleri: scripts/out/
```

## Cloudflare Pages

| Ayar | Değer |
|---|---|
| Framework preset | None (veya Vite) |
| Build komutu | `npm run build` |
| Build çıktı klasörü | `dist` |
| Node sürümü | 20 veya üstü (`NODE_VERSION` ortam değişkeni ile) |

SPA yönlendirmesi `public/_redirects` dosyasıyla yapılır (`/* /index.html 200`); build sırasında `dist/` içine kopyalanır.

## Yapı

```
src/
  lib/pricing/     saf hesaplama motoru (UI'dan bağımsız, Vitest ile test edilir)
  lib/format.ts    TL/saat/gram biçimlendirici, akıllı süre ve gram ayrıştırıcı
  db/              Dexie şeması, varsayılan veriler, repository (tüm veri erişimi)
  store/           Zustand: ayarlar, UI (tema, sidebar), toast
  components/ui/   GlassCard, Button, NumberInput, DurationInput, PriceCard, Select, Sheet…
  features/        calculator, onboarding, printers, settings, channels
  pages/           Hesapla, Ayarlar, "yakında" sayfaları
  app/             kabuk: sidebar, alt sekme çubuğu, üst çubuk, komut paleti, router
```
