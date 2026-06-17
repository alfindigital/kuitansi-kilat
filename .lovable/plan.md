# PRE-LAUNCH AUDIT REPORT — Notaku — 17 Jun 2026

## VERDICT: **GO with caveats** — no blockers; 2 medium issues + several polish items. Safe to launch after the medium items are addressed or accepted.

---

## STEP 0 FINDINGS

- **App:** Notaku — PWA nota/struk untuk UMKM Indonesia. Routes: `/` (Beranda), `/buat`, `/riwayat`, `/riwayat/$noteId`, `/pengaturan`, `/seo` (internal), `/sitemap.xml`.
- **Core flow:** Buat nota → simpan → lihat di Riwayat → bagikan via WA / PNG / salin teks.
- **Backend:** **CLIENT-ONLY** (IndexedDB via `idb-keyval`). Tidak ada Supabase/Cloud. → **BLOCK B** berlaku.
- **Auth:** Tidak ada (by design).
- **Payments:** Tidak ada.
- **Rendering:** TanStack Start SSR + hidrasi (cek `__root.tsx` shellComponent).
- **Locale:** Bahasa Indonesia (`<html lang="id">`, `og:locale=id_ID`).

---

## BLOCKERS

_None._

---

## HIGH

_None._

---

## MEDIUM

1. **`src/lib/theme.ts:6-15`** — FOUC potensial. `getInitialTheme()` jalan di client useState initializer; di SSR mengembalikan `"light"`. Pengguna dengan preferensi dark / theme tersimpan dark akan melihat flash putih sampai `useEffect` jalan. **Fix:** tambahkan `ScriptOnce` di `__root.tsx` yang membaca `localStorage('notaku-theme')` + `prefers-color-scheme` dan men-set `document.documentElement.classList.add('dark')` sebelum hidrasi.

2. **`src/routes/index.tsx`** — Halaman Beranda (homepage) tidak punya `<h1>` sama sekali (visible maupun `sr-only`). SEO & a11y: setiap route shareable harus punya satu H1. Riwayat dan halaman lain sudah pakai `<h1 className="sr-only">`. **Fix:** tambahkan `<h1 className="sr-only">Notaku — Dashboard Nota UMKM</h1>` (atau visible) di atas segmented Hari Ini/Bulan Ini.

---

## LOW

3. **Komponen UI tidak terpakai** — `src/components/ui/sheet.tsx` & `src/components/ui/collapsible.tsx` tidak diimpor di mana pun. Dependensi terkait (`@radix-ui/react-dialog`, `@radix-ui/react-collapsible`) bisa diprune jika sheet benar2 tidak dipakai. **Fix:** `rm` file + `bun remove` dep.

4. **`prompt()` / `confirm()` native di `src/routes/pengaturan.tsx:357,365,383`** — backup Import & Reset masih pakai dialog browser. Inkonsisten dgn design system. **Fix:** ganti dengan `Modal` (sudah ada pattern di `riwayat.tsx`).

5. **`src/lib/theme.ts:13`** — `prefers-color-scheme` hanya dipakai sekali di initial; tidak ada listener untuk perubahan OS theme saat app berjalan. **Fix (opsional):** subscribe `matchMedia(...).addEventListener('change', ...)` kalau user belum override manual.

6. **URL hardcoded di 8 file** (semua route `head()` + `__root.tsx` + `sitemap[.]xml.ts`). Konsisten ke `https://notaq.lovable.app`, tapi ganti domain = edit 8 tempat. **Fix:** ekstrak `SITE_URL` constant di `src/lib/seo.ts` atau env.

7. **`/seo` route** — internal status page tidak di-nav, tapi tetap accessible via URL & punya `robots: noindex`. Snapshot manual (`LAST_SCAN = "2026-05-31"`) sudah usang. **Fix:** hapus atau update.

8. **`src/router.tsx`** — masih ada `<h1>` "404" dan "Terjadi kesalahan" duplikat dengan `__root.tsx` ErrorComponent + NotFoundComponent. Cek apakah `defaultNotFoundComponent` di router.tsx benar-benar ter-mount (kemungkinan dead code). **Fix:** consolidate.

9. **`console.error` di production** (`__root.tsx:38,166,169`, `ErrorBoundary.tsx:14`, `server.ts:65,76`, `start.ts:12`, `router.tsx:6`, `riwayat.$noteId.tsx:64`, `pengaturan.tsx:352`). Sebagian besar di error boundary / error handler (acceptable). **Fix (kosmetik):** gate di balik `if (import.meta.env.DEV)` untuk yang non-essential.

10. **`waLink` di `src/lib/receipt.ts:48`** — asumsi nomor telepon Indonesia ("0…" → "62…"). Tidak validasi panjang. Salah format ditulis pengguna (mis. "+44…") akan diubah ke 62-44… → link WA invalid. **Fix:** kalau sudah ada "+" atau "62" prefix, skip normalisasi.

11. **`og-image.jpg` (171KB)** ada di `public/`, tapi tidak dapat dipastikan dari editor bahwa dimensinya 1200×630. **Manual check:** verifikasi via Linkedin Post Inspector / Twitter Card Validator setelah deploy.

12. **`src/routes/pengaturan.tsx:171`** — input Alamat: `<Textarea>` tanpa rate limit terhadap line breaks; user bisa paste 200 char dengan banyak `\n` → struk render aneh. **Fix:** strip `\n\n+` di setBusiness.

13. **`src/routes/buat.tsx:459`** — qty input pakai `parseFloat`. Bisa terima negatif yang langsung di-coerce ke 1, tapi `0.0001` lolos & masuk DB. NoteItemSchema `min(0.001)` jadi cap-nya `0.001`. Edge case kecil. **Fix:** floor/cap di onChange.

---

## UNVERIFIED (perlu manual test)

- Real-device responsive 360px / 768px / 1280px+ (tidak run browser di audit ini).
- Safari iOS Private mode + storage-blocked browser.
- Pollute IndexedDB dengan JSON rusak → recovery.
- Service worker behavior di prod URL (PWA install + offline).
- Lighthouse score di prod URL.
- OG image dimensi exact & validasi via debuggers Twitter/LinkedIn.

---

## CATEGORY SCORECARD

### CORE

| # | Category | Status | Note |
|---|----------|--------|------|
| 1 | Functionality | **PASS** | Semua route reachable; 404 + error component ada; semua flow end-to-end (buat → simpan → riwayat → share). |
| 2 | Security (core) | **PASS** | Zero secrets di codebase. Zero `dangerouslySetInnerHTML`. Zero `innerHTML`. No third-party CDN scripts kecuali Google Fonts (async, non-blocking). Input divalidasi zod sebelum write ke IDB. |
| 3 | UI/UX & Responsive | **PARTIAL** | Mobile-first, tap target ≥44px (`tap-target` class). Loading/empty/error states baru ditambah di Beranda+Riwayat. Belum diverifikasi 768/1280 layout. |
| 4 | Forms & Inputs | **PASS** | Validasi zod schema sebelum kvSet; double-submit dicegah via `disabled={mutation.isPending}` di buat.tsx:430 & pengaturan.tsx:189. Max length konsisten. |
| 5 | Performance | **PASS** | Calendar & html-to-image lazy-loaded. OmsetChart lazy. Suspense fallback dgn skeleton. Tidak ada N+1 (single IDB read). Aggregation memoized. Unused UI files (sheet, collapsible) bisa diprune (Low #3). |
| 6 | Code Hygiene | **PARTIAL** | Tidak ada TODO/FIXME, tidak ada console.log (hanya console.error/warn yang acceptable). Tidak ada hardcoded localhost. URL hardcoded di 8 file (Low #6). |
| 7 | Error Handling | **PASS** | ErrorBoundary class component + Route errorComponent + global `window.error` & `unhandledrejection` listener di __root. try/catch konsisten di IDB writes (`StorageWriteError` + quota detection). |
| 8 | Accessibility | **PARTIAL** | `<html lang="id">`, alt text pada `<img>` (logo bisnis & receipt). Hierarki H1/H2 ada. **Tapi `/` tidak punya H1** (Medium #2). Focus state visible via shadcn defaults. |
| 9 | Console & Network | **PASS** | Tidak ada console error/warning saat normal use (hanya peringatan dev tools dari `gpteng.co/lovable.js` saat di editor — bukan kode app). |
| 10 | SEO & AEO | **PASS** | Setiap route punya unique title/description/og:title/og:description + canonical. JSON-LD: Organization+WebSite+SoftwareApplication di root, BreadcrumbList + FAQPage + HowTo per route. Sitemap dinamis, robots.txt menunjuk sitemap, `llms.txt` lengkap. og:image, twitter:card sudah set. `lang="id"`. Favicon set + theme-color + manifest. |

### BLOCK B — CLIENT-ONLY

| # | Category | Status | Note |
|---|----------|--------|------|
| B1 | localStorage / IDB integrity | **PASS** | `kvGet` & `kvSet` wrapped in try/catch; quota error terdeteksi (`StorageWriteError.quota`). Schema versioning ada (`SCHEMA_VERSION=1` + `checkSchemaVersion` warn di DbSync). Migration legacy shape (`migrateNote`, `migrateBusiness`) ada. localStorage di theme & buat.tsx draft semua guarded. Multi-tab via BroadcastChannel + invalidate React Query. **Test belum:** corrupt-data recovery, quota di Safari (Unverified). |
| B2 | Client-only security reality | **PASS** | Tidak ada PII sensitif (alamat & nomor telepon adalah data bisnis pemilik, bukan secret). Tidak ada paid feature. Tidak ada admin gating client-only. |
| B3 | Edge cases & offline | **PARTIAL** | Service worker (`public/sw.js`) precache app shell + stale-while-revalidate. FOUC mungkin terjadi (Medium #1). Rapid-click dicegah via disabled state. **Zero-data, large-data (100+ entries), special chars belum di-stress-test (Unverified).** |

---

## SEO DELIVERABLES

### Temuan SEO

| Severity | Issue | File |
|----------|-------|------|
| Medium | Beranda tanpa H1 | `src/routes/index.tsx` |
| Low | URL hardcoded di 8 file (no SITE_URL constant) | semua route head() |
| Low | og-image.jpg dimensi belum diverifikasi 1200×630 | `public/og-image.jpg` |
| Low | `seo.tsx` snapshot LAST_SCAN usang | `src/routes/seo.tsx:8` |

Sisanya **PASSING**: title/desc/canonical per route, OG + Twitter cards, JSON-LD (Organization, WebSite, SoftwareApplication, BreadcrumbList, FAQPage, HowTo), robots.txt, sitemap.xml, llms.txt, lang, favicon/theme-color/manifest.

### Keyword map per page

**`/` (Beranda) — primary: "aplikasi nota umkm gratis"**
- Volume estimasi: ~500/bulan ID (long-tail). Intent: transactional/install. Difficulty: rendah.
- Supporting: "aplikasi catat penjualan harian", "rekap omset warung gratis", "aplikasi bon untuk warung", "aplikasi struk tanpa login".
- Current title sudah baik: "Notaku — Aplikasi Nota & Struk UMKM Gratis Tanpa Login" (60 char ✅).

**`/buat` — primary: "bikin nota online gratis"**
- Supporting: "cara bikin struk pelanggan", "kirim nota via whatsapp", "buat invoice umkm cepat", "aplikasi nota online tanpa daftar".
- Current title: "Bikin Nota Online Gratis — Cetak & Kirim WA · Notaku" ✅.

**`/riwayat` — primary: "rekap omset harian umkm"**
- Supporting: "catat penjualan harian online", "riwayat transaksi warung", "laba kotor umkm otomatis", "histori nota pelanggan".
- Current title: "Riwayat Nota & Rekap Omset Harian UMKM · Notaku" ✅.

**`/pengaturan` — primary: "backup data nota umkm"**
- Supporting: "preset menu warung", "logo struk umkm", "export data nota json", "atur identitas usaha".
- Current title: "Pengaturan Bisnis & Backup Data Nota · Notaku" ✅.

### Proposed (jika revisi)

Semua title/desc/H1 saat ini sudah selaras dengan keyword di atas; tidak perlu rewrite. **Satu-satunya tindakan SEO yg butuh kode:** tambah `<h1 sr-only>` di Beranda (Medium #2).

---

## MANUAL TEST CHECKLIST

- [ ] Real device 360px (iPhone SE) / 768px (iPad mini) / 1280px+ desktop — no horizontal scroll, tap target ≥44px.
- [ ] Safari iOS Private mode → buka app, toggle theme, buat nota → tidak crash, theme tetap apply walaupun localStorage write gagal silently.
- [ ] Brave strict shields / storage blocked → idem.
- [ ] Pollute IndexedDB: di DevTools, edit `notaku-db.kv` → ubah `notes` ke string garbage → reload → app harus recover ke empty state, tidak white-screen. (Schema gate `checkSchemaVersion` cover yang versi, bukan corrupt.)
- [ ] Clear site data → reopen → first-run UX (kosong, ada CTA "Buat nota").
- [ ] Simulasi data lama: tulis `notes` dengan shape legacy (`discountType: "percent"`, `discountValue: 10`) → reload → `migrateNote` map ke `discount` integer; verifikasi tampil benar.
- [ ] Deploy URL: Lighthouse mobile → Performance ≥ 90, SEO = 100, Best Practices ≥ 95, PWA installable ✅.
- [ ] View Page Source di prod → `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:*` muncul di raw HTML (bukan JS-injected). TanStack Start SSR seharusnya sudah render — wajib diverifikasi.
- [ ] LinkedIn Post Inspector + Twitter Card Validator: tempel URL prod → preview muncul dengan og-image 1200×630.
- [ ] Submit `sitemap.xml` ke Google Search Console; monitor indexing 7–14 hari.
- [ ] Install PWA di Android Chrome + iOS Safari "Add to Home Screen"; pastikan icon, splash, dan shortcut "Buat Nota Baru" jalan.
- [ ] Offline test: di prod URL, install PWA, matikan jaringan, buka app dari home screen → app shell render dari SW cache.
- [ ] Spam-click tombol Simpan di /buat → cuma 1 nota tersimpan (mutation guard).
- [ ] Buat 200+ nota dummy via import JSON → cek lag di Riwayat scroll & filter.
- [ ] Test nama pelanggan dengan emoji + RTL char + 60 char → tidak break layout receipt PNG.

---

## STOP

Tidak ada file yang dimodifikasi. Menunggu approval per tier:
- **Mulai dari Medium** (FOUC theme + H1 Beranda) — fix yg paling berdampak, diff kecil.
- Setelah itu Low #3 (prune unused UI), Low #4 (ganti `prompt/confirm` → Modal), dst.

Kasih tahu mau approve tier mana atau item mana spesifik.