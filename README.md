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
