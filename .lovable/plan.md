# Quick Wins — Mobile UX

Lima perbaikan kecil tapi berdampak besar untuk kenyamanan pakai Notaku di HP. Tidak mengubah logika bisnis — murni UI/UX.

## 1. Safe-area iOS (notch & home indicator)
- Tambah CSS util `pb-safe` / `pt-safe` pakai `env(safe-area-inset-*)`.
- Pasang `padding-bottom` aman di `AppShell` bottom nav supaya tidak ketabrak home indicator iPhone.
- Tambahkan `viewport-fit=cover` (sudah ada di `__root.tsx` ✓) dan pastikan body tidak punya bg yang motong.

## 2. Sticky action bar di /buat
- Tombol primary "Simpan & Cetak" jadi bar floating di bawah viewport (sticky, di atas bottom nav).
- Selalu terlihat — user tidak perlu scroll panjang setelah isi banyak item.
- Mirror total nota di bar yang sama supaya konfirmasi cepat sebelum simpan.

## 3. Input keyboard-aware
Di `buat.tsx` dan field input lain:
- Field angka (qty, harga, diskon): `inputMode="decimal"` + `enterKeyHint="next"`.
- Field nama pelanggan / catatan: `enterKeyHint="done"`.
- Field HP: `inputMode="tel"`.
- Field harga: auto-select isi saat focus (`onFocus={e => e.target.select()}`) — biar tinggal ketik tanpa hapus.

## 4. Audit tap target ≥ 44×44 px
Sapuan kecil di komponen yang sekarang masih sempit:
- Tombol toggle diskon (%/Rp) di /buat.
- Tombol +/- qty (cek apakah sudah 44px setelah improvement sebelumnya).
- Icon button hapus item, hapus preset, clear search.
- Link breadcrumb "Riwayat" di detail nota.
Tambahkan `min-h-11 min-w-11` (44px) + area padding klik yang luas, ikon tetap kecil secara visual.

## 5. Haptic feedback ringan
Helper `tapHaptic()` pakai `navigator.vibrate(10)` (no-op di iOS Safari, tetap aktif di Android Chrome):
- Tap qty +/-, hapus item, simpan nota, salin teks, kirim WA.
- Vibrate 20ms untuk konfirmasi simpan berhasil.

## Detail teknis

**File yang berubah:**
- `src/styles.css` — util `.pb-safe`, `.pt-safe`, `.h-tap` (44px min).
- `src/components/AppShell.tsx` — safe-area pada bottom nav.
- `src/routes/buat.tsx` — sticky save bar, inputMode, enterKeyHint, auto-select, haptic.
- `src/routes/riwayat.$noteId.tsx` — haptic pada action tile, tap target breadcrumb.
- `src/routes/riwayat.tsx` — tap target search clear.
- `src/routes/pengaturan.tsx` — inputMode untuk field nomor.
- Helper baru `src/lib/haptic.ts` (≤ 10 baris).

**Tidak menyentuh:** `storage.ts`, `receipt.ts`, struktur data, routing.

**Verifikasi:** cek visual di preview mobile 375×812, pastikan:
- Sticky bar tidak menutupi item terakhir (tambah padding-bottom pada container).
- Bottom nav tidak terpotong di iPhone (safe-area).
- Tombol +/- qty masih nyaman ditekan dengan jempol.
