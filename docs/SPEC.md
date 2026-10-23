# KATMAN — 3D Baskı Fiyat & İşletme Paneli

Claude Code için yapım promptu (3 parça + isteğe bağlı 4. parça)

> Nasıl kullanılır: Boş bir GitHub reposu aç (öneri: `katman`). Claude Code'a önce ORTAK BÖLÜM + PARÇA 1'i ver. Bitip test edildikten sonra PARÇA 2, sonra PARÇA 3. Her parçada "ORTAK BÖLÜM"ü tekrar yapıştırmana gerek yok; repo içindeki `docs/SPEC.md` dosyasına bu dosyanın tamamını koydurursan Claude Code her parçada oradan okur. İsim önerisi "Katman" (3D baskının katman katman çalışmasından). İstersen değiştir — tüm prompt'ta Katman geçen yerleri değiştirmen yeterli.

---

## ORTAK BÖLÜM (her parçada geçerli)

### 0. Proje özeti

Bir 3D baskı atölyesi için fiyatlandırma ve işletme paneli yapıyoruz. Ürünleri (çoğunlukla Bambu Lab yazıcılarla, MakerWorld modellerinden basılan) sisteme gireceğiz; panel iki ayrı fiyat önerecek:

- **Fiyat A — Maliyet oranlı:** toplam maliyet × maliyet çarpanı
- **Fiyat B — Saat oranlı:** toplam maliyet + baskı saati × saatlik kâr ücreti

Bu iki fiyat uygulamanın kalbidir; her ekranda en görünür şey bunlar olmalı. Bunun etrafına gerçek bir işletme paneli kuruyoruz: detaylı maliyet motoru, filament stoğu, yazıcılar, satış kanalı (Shopier/Trendyol/Etsy) komisyon hesabı, siparişler, teklif kartı ve kâr panosu.

Uygulama dili: Türkçe. Para birimi: TL (1.234,56 ₺ formatı, `Intl.NumberFormat('tr-TR')`). Tarih: tr-TR.

### 1. Teknoloji

- React + Vite + TypeScript (strict)
- Tailwind CSS (güncel sürüm), tasarım token'ları CSS değişkenleri olarak
- Radix UI primitifleri (Dialog, Popover, Select, Tabs, Tooltip, DropdownMenu, Switch, Slider) — kendi stilimizle
- framer-motion (hafif animasyon, prefers-reduced-motion'a uy)
- Zustand (ayarlar ve UI durumu), Dexie (IndexedDB — tüm veriler cihazda)
- Recharts (grafikler), lucide-react (ikonlar), zod (form doğrulama), react-router
- vite-plugin-pwa (Parça 3'te)
- Vitest (hesaplama motoru testleri)
- Deploy: Cloudflare Pages (build: `npm run build`, çıktı: `dist`). SPA yönlendirmesi için `public/_redirects` → `/* /index.html 200`
  - _Uygulama notu: yayın Cloudflare Workers üzerinden yapılıyor; SPA yönlendirmesi `wrangler.jsonc` (`not_found_handling`) ile, `_redirects` kullanılmıyor (Workers bu kuralı reddediyor)._

### 2. Klasör yapısı

```
src/
  lib/pricing/        ← SAF hesaplama fonksiyonları (UI'dan bağımsız, testli)
  lib/format.ts       ← TL, saat, gram formatlayıcılar + akıllı süre ayrıştırıcı
  db/                 ← Dexie şeması + repository fonksiyonları (ileride bulut senkronu eklenebilsin diye tüm veri erişimi buradan)
  store/              ← Zustand (ayarlar, tema, sidebar)
  components/ui/      ← GlassCard, Button, Input, NumberInput, Badge, Stat, Sheet, EmptyState...
  features/           ← calculator, products, filaments, printers, channels, orders, quotes, dashboard, settings
  pages/
docs/SPEC.md          ← bu dosya
```

### 3. Hesaplama motoru (EN KRİTİK KISIM — `src/lib/pricing/`)

Tüm hesaplar saf fonksiyon olacak, para hesaplarında ara adımlarda yuvarlama YAPMA, sadece gösterirken 2 haneye yuvarla.

**Girdiler (ürün başına):**

- `filaments[]`: her biri `{ filamentId, gram, purgeGram }` (çok renkli/AMS baskılarda renk değişim atığı = purge; Bambu Studio bunu ayrı gösterir)
- `printHours` (baskı süresi, saat cinsinden ondalık)
- `printerId`
- `laborMinutes` (destek söküm, temizlik, zımpara, montaj, boyama — el emeği)
- `extras[]`: `{ ad, tutar }` (anahtarlık halkası, mıknatıs, LED, vida, boya…)
- `packaging` (ambalaj)
- `unitsPerPlate` (bir baskıda kaç adet çıkıyor; varsayılan 1)

**Ayarlardan gelenler:** elektrik kWh fiyatı, saatlik işçilik ücreti, fire oranı, maliyet çarpanı (Fiyat A), saatlik kâr ücreti (Fiyat B), yuvarlama modu, KDV açık/kapalı + oranı, varsayılan ambalaj.

**Yazıcıdan gelenler:** satın alma fiyatı, hurda/ikinci el değeri, ömür (saat), ortalama watt, saatlik bakım/sarf (nozzle, PTFE, plaka, yağ).

**Formüller:**

```
gramFiyatı_i        = makaraFiyatı_i / makaraGramı_i
filamentMaliyeti    = Σ (gram_i + purgeGram_i) × gramFiyatı_i
elektrik            = (watt / 1000) × printHours × kWhFiyatı
amortisman          = ((yazıcıFiyatı − hurdaDeğeri) / ömürSaat) × printHours
bakım               = saatlikBakım × printHours
üretimHam           = filamentMaliyeti + elektrik + amortisman + bakım
üretimFireli        = üretimHam / (1 − fireOranı)        ← fire SADECE makine+malzemeye uygulanır
işçilik             = (laborMinutes / 60) × saatlikİşçilik
ekler               = Σ extras + packaging
TOPLAM_MALİYET      = (üretimFireli / unitsPerPlate) + işçilik + ekler
                      (unitsPerPlate > 1 ise baskı maliyeti adetlere bölünür; işçilik ve ekler adet başıdır)
adetBaşıBaskıSaati  = printHours / unitsPerPlate

FİYAT_A             = TOPLAM_MALİYET × maliyetÇarpanı
FİYAT_B             = TOPLAM_MALİYET + adetBaşıBaskıSaati × saatlikKârÜcreti
                      (ayarlarda "B'ye maliyeti ekleme" seçeneği: FİYAT_B = adetBaşıBaskıSaati × saatlikKârÜcreti)

kâr                 = fiyat − TOPLAM_MALİYET
marj (%)            = kâr / fiyat × 100
markup (%)          = kâr / TOPLAM_MALİYET × 100
saatBaşıKâr         = kâr / adetBaşıBaskıSaati      ← yazıcı kapasitesi sınırlı olduğu için en önemli metrik
fiyatKDVDahil       = fiyat × (1 + KDV)               (KDV açıksa)
```

**Hızlı mod:** Kullanıcı sadece ürün adı, maliyet (TL) ve baskı saati girer → TOPLAM_MALİYET = girilen maliyet, A ve B aynı formüllerle çıkar. Bu, kullanıcının asıl istediği akış; detaylı mod bunun üstüne eklenen bir seçenek. Form üstünde Hızlı | Detaylı segment kontrolü olsun, varsayılan Detaylı ama Hızlı tek tıkla.

**Yuvarlama modları (yukarı doğru):** Yok · en yakın 5 · en yakın 10 · "…9 ile bitir" (302,97 → 309) · "…9,90 ile bitir" (302,97 → 309,90) · "…49 / …99 ile bitir" (302,97 → 349; 351 → 399). Kâr hesapları yuvarlanmış fiyat üzerinden gösterilir; yuvarlanmamış değer küçük gri yazıyla altında.

**Satış kanalı fiyatı (tersine hesap):** Hedef = elimize geçmesini istediğimiz tutar (A, B veya manuel fiyat).

```
efektifOran   = komisyonOranı × (komisyonaKDVEklenir ? 1 + 0.20 : 1) + ekYüzdeler
efektifSabit  = sabitÜcret × (komisyonaKDVEklenir ? 1.20 : 1) + satıcıKargo
listeFiyatı   = (hedef + efektifSabit) / (1 − efektifOran)
```

Ardından yuvarlama modu uygulanır ve "kanal kesintisi = listeFiyatı − hedef" gösterilir.

**Akıllı süre girişi (parseDuration):** `4.5`, `4,5`, `4:30`, `4s 30dk`, `4 saat 30 dakika`, `4h30m`, `270dk`, `1d 2h` → hepsi doğru saate çevrilsin. Akıllı gram girişi: `85`, `85g`, `85,4 g`, `0.085kg`. Kullanıcı Bambu Studio'daki "1h 23m" ve "45.21 g" yazılarını kopyalayıp yapıştırabilsin.

**ZORUNLU TESTLER (Vitest) — bu sayılar birebir çıkmalı:**
Ayarlar: kWh 4,00 TL · işçilik 200 TL/saat · fire %5 · çarpan 2,0 · saatlik kâr 30 TL · yuvarlama "…9". Yazıcı: 35.000 TL, hurda 5.000 TL, ömür 5.000 saat (→ 6,00 TL/saat), 120 W, bakım 1,50 TL/saat. Filament: PLA 600 TL / 1000 g. Ürün: 85 g, purge 0, 4,5 saat, 15 dk işçilik, ambalaj 10 TL, 1 adet/plaka.

```
filament 51,00 · elektrik 2,16 · amortisman 27,00 · bakım 6,75 · üretimHam 86,91
üretimFireli 91,48 · işçilik 50,00 · ekler 10,00 · TOPLAM 151,48
FİYAT_A ham 302,97 → yuvarlanmış 309
FİYAT_B ham 286,48 → yuvarlanmış 289
Shopier (%5,99 + 0,49 TL, komisyona KDV eklenir) hedef 309 → liste ham 333,56 → 339
Trendyol (%15, KDV dahil) hedef 309 → liste ham 363,53 → 369
```

Ayrıca test et: purge'lu çok renkli ürün, unitsPerPlate=8, fire %0, hızlı mod, parseDuration örneklerinin hepsi.

### 4. Varsayılan veriler (hepsi Ayarlar'dan düzenlenebilir, "tahmini" etiketiyle)

- **Elektrik:** 4,00 TL/kWh (açıklama: "Faturandaki birim fiyatı gir. Mesken düşük kademe ~2,6–2,9 TL, yüksek kademe ~3,9–4,3 TL, ticarethane ~4,8 TL civarı. 2026'da birkaç kez zam geldi.")
- **Fire oranı:** %5 (açıklama: "İyi ayarlı Bambu yazıcıda %3–5, yeni başlayanda %15–30")
- **Yazıcı presetleri** (watt değerleri tahmini ortalama, kullanıcı priz wattmetresiyle düzeltebilir): Bambu Lab A1 mini (80 W), A1 (100 W), P1S (120 W), X1C (130 W), H2D (200 W), Diğer. _(Kullanıcı isteğiyle eklendi: A2 ~110 W, A2L ~150 W — resmi ortalama değer yayınlanmadığı için tahmini.)_ Ömür varsayılanı 5.000 saat. Fiyat alanı boş gelsin, kullanıcı kendi aldığı fiyatı girsin.
- **Filament türleri** (TL/kg tahmini, yoğunluk g/cm³): PLA 600 (1,24) · PLA Matte 650 (1,24) · PLA Silk 700 (1,24) · PETG 650 (1,27) · ABS 650 (1,04) · ASA 900 (1,07) · TPU 1.000 (1,21) · PLA-CF 1.100 (1,30) · PLA Wood 900 (1,15). Makara gramı varsayılan 1000.
- **Satış kanalları** (her biri düzenlenebilir, yeni kanal eklenebilir; her kartta "son doğrulama tarihi" alanı ve "Oranları satıcı panelinden doğrula" notu):

| Kanal | Komisyon | Sabit | Komisyona KDV eklenir mi | Not |
|---|---|---|---|---|
| Elden / Instagram DM | %0 | 0 | — | |
| Shopier | %5,99 | 0,49 TL | Evet | Aylık ciro arttıkça oran düşer; kademe seçilebilsin |
| Trendyol | %15 | 0 | Hayır (KDV dahil) | Hobi/ev-yaşam ~%10–21; kategoriye göre |
| Hepsiburada | %18 | 0 | Hayır | |
| Çiçeksepeti | %15 | 0 | Hayır | + %1,5 altyapı bedeli (ekYüzde) |
| Etsy | %6,5 işlem + ödeme işleme + düzenleyici ücret | 0,20 $ listeleme | — | USD kuru manuel girilir |

### 5. Tasarım sistemi — "yeni nesil SaaS, cam efektli"

Hedef his: Linear / Vercel / Raycast kalitesinde, sade ama premium. Kalabalık değil; boşluk bol, tipografi güçlü.

**Renkler** (koyu tema varsayılan, açık tema da tam desteklensin):

- Arka plan `#07070B`; üzerinde sabit konumlu 3 büyük bulanık renk lekesi (gradient mesh, %15–25 opaklık) + çok ince "baskı tablası" ızgarası (1px çizgiler, %4 opaklık) + hafif noise dokusu
- Cam yüzey: `rgba(255,255,255,0.05)`, `backdrop-filter: blur(20px) saturate(140%)`, kenarlık `rgba(255,255,255,0.08)`, üst kenarda 1px iç parlama (inset highlight)
- Metin `#F5F5F7`, ikincil `#A1A1AA`, soluk `#71717A`
- Vurgu: "filament gradyanı" `#FF7A18 → #FF3D77 → #7C5CFF` (birincil butonlar, aktif menü, fiyat rakamlarının altındaki çizgi)
- Durum: başarı `#22C55E`, uyarı `#F59E0B`, tehlike `#EF4444`, bilgi `#38BDF8`
- Fiyat A kartı turuncu-pembe tonlu, Fiyat B kartı mor-mavi tonlu → iki fiyat her yerde renkle ayırt edilsin
- Filament renkleri gerçek HEX swatch (yuvarlak, makara ikonu içinde) olarak gösterilsin

**Tipografi:** Inter (veya Geist). Tüm sayılar `font-variant-numeric: tabular-nums`. Fiyat rakamları 44–56px, kalın, sıkı harf aralığı. Etiketler 12–13px, büyük harf değil, soluk renk. **Köşe:** kart 20px, input/buton 12px, rozet tam yuvarlak. **Gölge:** çok yumuşak, renkli değil. **Hareket:** sayfa geçişlerinde 150–200ms fade+4px kayma; fiyat değişince sayı yumuşakça sayarak değişsin (count-up, 300ms); hover'da cam kart hafif aydınlansın. Abartı yok. prefers-reduced-motion açıksa animasyon kapalı. **Performans:** mobilde blur değerini 12px'e düşür, aynı anda ekranda çok sayıda blur katmanı olmasın.

**Yerleşim — Masaüstü (öncelik):**

- Sol sidebar 248px (72px'e daraltılabilir, durumu hatırlansın): logo, menü (Panel, Hesapla, Ürünler, Siparişler, Teklifler, Filamentler, Yazıcılar, Kanallar, Ayarlar), altta tema düğmesi
- Üst çubuk: sayfa başlığı, arama / komut paleti (⌘K / Ctrl+K), "+ Yeni ürün" birincil butonu
- İçerik max 1440px, ortalı, 24–32px kenar boşluğu
- Hesapla sayfası: iki sütun. Solda form (bölümler: Temel bilgiler · Filament · Baskı · İşçilik & ekler), sağda yapışkan (sticky) Fiyat Paneli: büyük Fiyat A ve Fiyat B kartları, altında maliyet dağılımı halka grafiği, kâr/marj/saat başı kâr, kanal fiyatları tablosu, "Kaydet" ve "Teklif oluştur" butonları. Her girdi değiştiğinde sağ panel anında güncellenir.

**Yerleşim — Mobil (taşma OLMAYACAK):**

- Sidebar yerine alt sekme çubuğu (5 sekme: Panel, Hesapla, Ürünler, Siparişler, Daha fazla). `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)`
- Hesapla sayfasında Fiyat Paneli → ekranın altında, sekme çubuğunun hemen üstünde ince "mini fiyat çubuğu" (A ve B yan yana); dokununca alttan açılan sheet ile tam panel
- Kurallar (hepsi zorunlu):
  - Tüm input/select/textarea mobilde `font-size: 16px` (iOS'ta odaklanınca zoom yapmasın)
  - `100vh` YASAK → `100dvh` / `min-h-dvh` kullan; klavye açılınca alt çubuk yukarı kaymasın (visualViewport ile klavye açıkken alt çubuğu gizle)
  - `html, body { overflow-x: clip }`; flex/grid çocuklarına `min-w-0`; uzun ürün adlarında truncate veya break-words
  - Tablolar mobilde kart listesine dönüşsün (yatay kaydırmalı tablo yok; kaçınılmazsa sadece tablonun kendi kapsayıcısı kaysın)
  - Dokunma hedefleri en az 44×44px
  - Test genişlikleri: 360, 390, 430, 768, 1024, 1280, 1440 px — hiçbirinde yatay kaydırma çıkmamalı
  - Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover`

**Ortak bileşenler:** GlassCard, StatCard (değer + değişim rozeti), PriceCard (A/B), NumberInput (sağda birim etiketi: ₺, g, saat, dk, %, W; ok tuşlarıyla artır/azalt; virgül ve nokta ikisini de kabul et), DurationInput, ColorSwatch, Badge, EmptyState (ikon + açıklama + aksiyon), ConfirmDialog, Toast (silmede "Geri al" butonlu), Skeleton.

### 6. Genel kurallar

- Bildirim, ses, gereksiz otomasyon YOK. Uyarılar sadece ekranda rozet/şerit olarak.
- Silme işlemleri onay ister ya da "Geri al" toast'ı verir.
- Her boş ekranın şık bir boş durumu olsun.
- Erişilebilirlik: klavyeyle gezilebilir, focus halkası görünür, kontrast yeterli.
- Kod temiz, bileşenler küçük, `any` yok.
- Dürüstlük: Bir parçayı bitirdiğinde neyi gerçekten çalıştırıp test ettiğini (testler, build, hangi ekran genişlikleri) ve neyi test edemediğini açıkça yaz. Test etmediğin şeye "çalışıyor" deme.

---

## PARÇA 1 — Altyapı, tasarım, hesaplama motoru, Hesapla ekranı

1. Projeyi kur (Bölüm 1), klasör yapısı (Bölüm 2), tasarım token'ları ve ortak bileşenler (Bölüm 5). Koyu/açık tema + sistem teması.
2. Uygulama iskeleti: sidebar (masaüstü), alt sekme çubuğu (mobil), üst çubuk, router. Henüz yapılmamış sayfalar şık bir "yakında" boş durumu göstersin.
3. `src/lib/pricing/` hesaplama motoru + parseDuration / gram ayrıştırıcı + Bölüm 3'teki tüm testler (geçmeden devam etme).
4. Dexie şeması (ileriki parçalar için de): settings, printers, filamentTypes, spools, channels, products, orders, quotes, priceHistory. Bölüm 4'teki varsayılanlarla tohumla (seed).
5. İlk açılış sihirbazı (3 adım, atlanabilir): ① Yazıcın (preset seç + aldığın fiyat) ② Elektrik birim fiyatı ③ Oranların: maliyet çarpanı ve saatlik kâr ücreti (canlı örnek fiyat göstererek).
6. Ayarlar sayfası: tüm varsayılanlar, yuvarlama modu, KDV, para formatı. Her alanın yanında kısa açıklama (ⓘ tooltip).
7. Hesapla sayfası (Bölüm 5'teki iki sütunlu düzen):
   - Hızlı / Detaylı mod
   - Temel: ürün adı, kategori, fotoğraf (cihazdan yükle, sıkıştırıp IndexedDB'ye kaydet, max ~400 KB), MakerWorld/model linki, etiketler
   - Filament: birden fazla satır (tür/makara seç + gram + purge gram), "Satır ekle"
   - Baskı: yazıcı seç, süre (akıllı giriş), plaka başı adet
   - İşçilik & ekler: dakika, ek parça satırları, ambalaj
   - Sağ panel: Fiyat A, Fiyat B (yuvarlanmış büyük, ham küçük), hangisi yüksekse küçük "yüksek" rozeti; taban fiyat (= maliyet, "bunun altı zarar"); manuel fiyat alanı + canlı kâr/marj/markup/saat başı kâr; maliyet dağılımı halka grafiği (filament, elektrik, amortisman, bakım, fire, işçilik, ekler); KDV açıksa KDV dahil fiyatlar
   - "Kaydet" → ürün olarak kaydeder (Parça 2'de listelenecek). Kaydederken o anki hesap sonuçları da snapshot olarak saklansın.
8. Bitince: testleri ve `npm run build`'i çalıştır, 360 ve 1440 px'te taşma kontrolü yap, Cloudflare Pages ayarlarını (build komutu, çıktı klasörü) README'ye yaz, sonuçları dürüstçe raporla.

---

## PARÇA 2 — Ürün kataloğu, filament stoğu, yazıcılar, kanallar, teklif

`docs/SPEC.md`'yi oku; Parça 1'in üzerine ekle, mevcut tasarım sistemini kullan.

1. **Ürünler sayfası**
   - Izgara (fotoğraflı kart) ve liste görünümü arasında geçiş
   - Kartta: fotoğraf, ad, kategori, filament renk swatch'ları, baskı süresi, Fiyat A / Fiyat B / satış fiyatı, marj rozeti (renkli: <%20 kırmızı, %20–40 sarı, >%40 yeşil), saat başı kâr
   - Arama, kategori/etiket filtresi, sıralama (ad, fiyat, marj, saat başı kâr, son güncelleme)
   - Ürün detay: hesap dökümü, "Satış fiyatı" (A, B veya manuel seçilip kaydedilir), varyantlar (aynı ürünün boy/renk seçenekleri — her varyant kendi gram/süresiyle), baskı notları (katman yüksekliği, dolgu %, nozzle, plaka tipi, destek), model lisansı alanı (Ticari satışa uygun / Sadece kişisel / Ticari lisans alındı / Bilinmiyor — "uygun değil" veya "bilinmiyor" ise kartta uyarı rozeti; MakerWorld'den basılan modellerin satışa uygunluğu için önemli)
   - Çoğalt, düzenle, sil (geri al'lı), arşivle
   - Rakip fiyatı alanı (ör. Trendyol'daki benzer ürün): fiyatımızın rakibe göre konumunu küçük bir çubukla göster
   - Toplu adet fiyatı: 1 / 5 / 10 / 25 / 50 adet için kademeli indirim tablosu (indirim oranları ayarlardan; maliyetin altına düşerse kırmızı uyarı)
2. **Fiyatı eskimiş ürünler:** Filament, elektrik veya oran ayarı değişince tüm ürünler yeniden hesaplanır. Kayıtlı satış fiyatı ile yeni hesaplanan fiyat arasında fark > %5 ise Ürünler sayfasının üstünde şerit: "7 ürünün fiyatı güncel maliyetin gerisinde" → listede eski/yeni karşılaştırması, tek tek veya toplu "yeni fiyatı uygula". Her fiyat değişikliği `priceHistory`'ye yazılır; ürün detayında küçük çizgi grafik.
3. **Filamentler sayfası**
   - Sekme 1 — Türler: Bölüm 4'teki kütüphane, düzenlenebilir
   - Sekme 2 — Makaralar (stok): marka, tür, renk adı + HEX, makara fiyatı, makara gramı, kalan gram, alış tarihi, tedarikçi, not. Kalan miktar ilerleme çubuğu + makara ikonu renginde
   - Düşük stok rozeti (eşik ayarlanabilir, ör. 150 g) — bildirim değil, sadece ekranda
   - "Makara tartarak güncelle": boş makara ağırlığı kayıtlıysa, tartılan toplam ağırlıktan kalan gram hesaplansın
   - Ortalama gram fiyatı (aynı türden birden fazla makara varsa ağırlıklı ortalama) — hesaplamada seçilebilir
4. **Yazıcılar sayfası:** birden fazla yazıcı; her biri için fiyat, hurda, ömür, watt, bakım, toplam basılan saat (siparişlerden otomatik), amortisman ilerlemesi ("yazıcı kendini %38 ödedi" halka grafiği — tamamlanan siparişlerdeki amortisman payı toplamı / yazıcı fiyatı), bakım kaydı (nozzle değişimi vb. tarih + not).
5. **Kanallar sayfası:** Bölüm 4'teki kanallar, düzenleme, yeni kanal ekleme, Shopier kademe seçimi, Etsy için USD kuru alanı (manuel). Hesapla sayfasındaki ve ürün detayındaki kanal fiyat tablosu: her kanal için liste fiyatı, kanal kesintisi, elimize geçen. Hedef olarak A / B / satış fiyatı seçilebilsin.
6. **Teklif (müşteriye fiyat) oluşturucu**
   - Özel sipariş için: müşteri adı, ürün(ler) + adet, ek not, geçerlilik tarihi, teslim süresi tahmini
   - Şık bir teklif kartı önizlemesi (marka adı/logo ayarlardan; sadece müşteriye gösterilecek bilgiler — maliyet, kâr ASLA görünmez)
   - "Görsel olarak indir" (PNG — html-to-image), "WhatsApp/Instagram metnini kopyala" (düz metin), "Yazdır/PDF" (print stylesheet)
   - Teklif durumu: Taslak → Gönderildi → Kabul → Reddedildi; kabul edilen teklif tek tıkla siparişe dönüşür (Parça 3)
7. **Komut paleti (⌘K):** ürün ara, sayfaya git, "yeni ürün", "yeni teklif", tema değiştir.
8. Testleri genişlet (varyant, toplu fiyat, kanal tablosu, eskimiş fiyat tespiti), build al, 360/390/768/1280/1440 px'te kontrol et, dürüst rapor ver.

> Parça 3 metni bu repoya henüz eklenmedi; o parçaya geçildiğinde buraya eklenmeli.

