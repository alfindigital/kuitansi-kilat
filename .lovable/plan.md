# Notaku — Plan MVP

App mobile-first (PWA) untuk UMKM: bikin nota cepat, share struk ke WA, simpan riwayat & pelanggan. Semua data tersimpan **lokal di HP** (tanpa login, tanpa cloud).

## Prinsip
- Sat-set: 3 tap untuk bikin nota.
- 3 tab utama saja: **Buat · Riwayat · Pengaturan**.
- Tanpa fitur ribet (tanpa pajak, tanpa multi-currency, tanpa login).
- Mobile-first; desktop tetap rapi.

## Halaman & Fitur

### 1. Buat Nota (home)
- Field nama pelanggan (opsional) dengan **auto-suggest** dari nota lama → otomatis isi nomor HP-nya.
- Tanggal (default hari ini, bisa diubah).
- Daftar item: nama, qty, harga. Tombol **Tambah baris** & **Preset** (chip item siap pakai).
- **Diskon** (toggle): nominal atau persen.
- Total live di tombol **Simpan**.
- Setelah simpan → sheet aksi: **Share PNG**, **Salin teks WA**, **Kirim ke pelanggan via WA** (kalau ada nomor), **Selesai**.

### 2. Riwayat
- Kartu performa: **Hari ini** & **Bulan ini** (omset, jumlah nota, total qty).
- Search (nama/nomor nota) + filter tanggal (Dari–Sampai).
- List nota → tap untuk lihat / edit / hapus / share ulang.

### 3. Pengaturan
- **Identitas Bisnis**: logo, nama, telepon, alamat, prefix nota (mis. `NT-2026-0001`).
- **Preset Item**: tambah/hapus item siap pakai.
- **Pelanggan**: list singkat dari nota (auto, tidak perlu input manual) — hanya muncul kalau ada datanya, dengan tombol kirim WA cepat.
- **Backup & Restore**: export/import JSON.
- **Reset data**.

## Output Struk
- **PNG** (render dari komponen struk via `html-to-image`) — ukuran mirip struk thermal, ringan untuk WA.
- **Teks polos** siap salin-tempel ke WA (header bisnis, item, total, terima kasih).
- Tombol "Kirim ke WA" → buka `wa.me/<nomor>` dengan teks struk terisi otomatis.

## Tampilan
Akan saya refresh minimalis baru. Setelah plan ini disetujui, saya akan:
1. Tanya 3 preferensi visual (palette, typografi, layout) dengan opsi visual.
2. Generate 3 design direction yang sudah dirender.
3. Kamu pilih satu, baru saya implement.

## Detail Teknis

**Stack**: TanStack Start (existing), React 19, Tailwind v4, shadcn/ui. Tanpa Lovable Cloud.

**Storage**: IndexedDB via `idb-keyval` (lebih aman dari localStorage untuk data + logo image base64). Schema:
- `business` — identitas bisnis + prefix
- `presets[]` — item siap pakai
- `notes[]` — `{ id, number, date, customerName?, customerPhone?, items[], discount, total }`
- Pelanggan **diturunkan** dari notes (tidak ada tabel terpisah) → auto-suggest pakai `Map` by phone/name.

**Routes** (file-based, `src/routes/`):
- `index.tsx` → redirect ke `/buat`
- `buat.tsx`, `riwayat.tsx`, `riwayat.$noteId.tsx`, `pengaturan.tsx`
- Layout dengan bottom tab bar (Buat / Riwayat / Pengaturan).

**Utilitas**:
- `formatIDR(n)` → `Rp 25.000`
- `parseIDRInput` → terima ketik bebas, simpan integer
- `generateNoteNumber(prefix, lastSeq)` → `NT-2026-0001`
- `buildWhatsAppText(note, business)` → teks struk
- `renderReceiptPNG(ref)` via `html-to-image`
- Validasi input pakai `zod` (nama max 100, phone digit-only max 20, item name max 80, harga ≥ 0, qty 1–9999, max 100 item per nota).

**PWA**: manifest + icon + theme-color hijau (sementara, akan diganti dari direction terpilih). Service worker via `vite-plugin-pwa` agar bisa diinstall di HP & jalan offline.

**Dependencies tambahan**: `idb-keyval`, `html-to-image`, `vite-plugin-pwa`, `zod` (kemungkinan sudah ada).

**Out of scope MVP**: cloud sync, multi-user, pajak, multi-currency, print thermal langsung (Bluetooth), kategori produk, stok.

## Urutan Build
1. Routing + bottom tab + layout shell.
2. Storage layer (idb-keyval + helpers + zod schema).
3. Halaman Buat (form + preset + diskon + simpan).
4. Share sheet (PNG + teks WA + wa.me).
5. Halaman Riwayat (rekap + search + filter + detail).
6. Halaman Pengaturan (identitas + preset + backup/restore).
7. PWA manifest + install prompt.
8. Polish + empty states + micro-interactions sesuai design direction terpilih.