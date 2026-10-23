# Katman — 3D Baskı Fiyat & İşletme Paneli

Bir 3D baskı atölyesi için fiyatlandırma ve işletme paneli. Her ürün için iki fiyat önerir:

- **Fiyat A — maliyet oranlı:** toplam maliyet × maliyet çarpanı
- **Fiyat B — saat oranlı:** toplam maliyet + adet başı baskı saati × saatlik kâr ücreti

Tüm veriler tarayıcıda (IndexedDB) saklanır; sunucu yoktur. Tam şartname: [`docs/SPEC.md`](docs/SPEC.md).

## Durum

- **Parça 1:** altyapı, tasarım sistemi, hesaplama motoru + testler, Dexie şeması, ilk açılış sihirbazı, Ayarlar ve Hesapla.
- **Parça 2:** Ürünler (ızgara/liste, filtre, detay, varyant, lisans, rakip, toplu adet, fiyat geçmişi, eskimiş fiyat uyarısı),
  Filamentler (türler + makara stoğu), Yazıcılar (kullanım, amortisman halkası, bakım kaydı), Kanallar, Teklif oluşturucu (PNG / metin / yazdır).
- **Parça 3:** Siparişler (Kanban sürükle-bırak, mobil durum sekmeleri, filament yeter mi, stoktan düşme/geri alma, fire kaydı + gerçek fire oranı),
  Panel (KPI + değişim, aylık grafik, kanal dağılımı, en iyi ürünler, filament tüketimi, kapasite, başa baş), fiyat listesi (A4 + Instagram hikâyesi),
  JSON yedek / geri yükleme, Excel uyumlu CSV, örnek veri, PWA (çevrimdışı, ana ekrana eklenebilir), klavye kısayolları (`N`, `/`, `⌘K`).

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest — hesaplama motoru, sipariş/stok, yedek, analiz testleri
npm run build      # tsc -b && vite build → dist/
```

Uçtan uca duman testi + yatay taşma kontrolü (Playwright, yüklü Chromium ile):

```bash
npm run build && npx vite preview --port 4173 &
node scripts/e2e-check.mjs   # ekran görüntüleri: scripts/out/
```

PWA ikonları `public/icons/icon.svg`'den üretilir: `node scripts/make-icons.mjs`.

## Cloudflare'a yayınlama

### Workers (Workers & Pages → "Import a repository" akışı)

| Ayar | Değer |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | `main` |

`wrangler.jsonc` statik varlıkları `dist/` klasöründen yayınlar ve SPA yönlendirmesini
(`not_found_handling: single-page-application`) açar. Worker adı (`name`) panelde oluşturulan
Worker adıyla aynı olmalı; farklıysa `wrangler.jsonc` içindeki `name` alanını değiştir.

SPA yönlendirmesi yalnızca `wrangler.jsonc` ile yapılır; repoda `_redirects` dosyası **olmamalı**
(Workers, `/* /index.html 200` kuralını "sonsuz döngü" hatasıyla reddeder).

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
