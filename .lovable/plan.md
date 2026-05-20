# Refresh tampilan Notaku — modern minimalis, mobile-first

Tampilan sekarang masih kaku: header tebal, bottom nav datar, kartu border tipis, tombol persegi, tipografi belum punya hierarchy. Goal: kesan iOS-class — bersih, lapang, ada depth halus, gesture-friendly di HP, tetap rapi di desktop.

Catatan: URL referensi `struk.replit.app` saat ini menampilkan "App isn't live yet", jadi arah desain mengacu pada brief minimalis modern + palette **Paper & Ink** yang sudah disepakati. Tidak ada perubahan logika/fitur — murni presentational.

## Arah desain
- **Surface bertingkat**: background paper, kartu sedikit lebih terang dengan shadow ultra-soft (bukan border keras) → kesan "kartu mengapung".
- **Spacing lebih lapang**: padding kartu naik, jarak antar-section naik, max-width tetap mobile-first.
- **Tipografi punya ritme**: Sora display besar + tracking ketat untuk angka total, label kecil uppercase tipis, body Manrope.
- **Tombol pill** (rounded-full) untuk aksi utama, ghost button minimalis untuk aksi sekunder.
- **Bottom nav floating**: pill mengambang dengan blur + shadow, ikon aktif diberi background lembut (bukan sekadar warna), bukan bar full-width yang nempel.
- **Header tipis & sticky** dengan blur, judul halaman tampil di header saat di-scroll.
- **Micro-interaction**: transisi active state, tap feedback (scale-95), focus ring halus.
- **Input "borderless"**: garis bawah / fill ringan, bukan kotak border tegas — terasa lebih modern di HP.

## Yang akan diubah (frontend only)

1. **`src/styles.css`**
   - Tambah token: `--shadow-soft`, `--shadow-pop`, `--surface-elevated`.
   - Sedikit hangatkan card surface biar kontras dengan background.
   - Tambah utility `.tap` (active:scale-[0.98] transition) untuk tombol.
   - Naikkan `--radius` ke 0.75rem (radius default lebih bulat).

2. **`src/components/AppShell.tsx`**
   - Header tipis, transparan + blur, judul halaman dinamis per route.
   - Bottom nav: pill floating (mx-4 mb-4), shadow halus, active item dapat pill background, label kecil.
   - Container `max-w-md` di mobile, `max-w-2xl` di tablet+.

3. **`src/routes/buat.tsx`**
   - Header section: title besar + chip tanggal di kanan (bukan input telanjang).
   - Customer & item dibungkus card elevated, label uppercase mungil.
   - Item row redesign: nama jadi heading row, qty × harga di bawah, tombol hapus icon-only mengambang.
   - Diskon pakai segmented control modern (track abu, thumb bergeser).
   - Summary card jadi "ringkasan biaya" dengan total besar di kanan.
   - CTA bawah: pill mengambang full-width, sticky di atas bottom nav, ada ikon → kontras tinggi.
   - ShareSheet: handle indikator, tombol aksi jadi grid dengan ikon besar di atas + label di bawah.

4. **`src/routes/riwayat.tsx`**
   - Stats jadi 2 chip ringkas (hari ini · bulan ini) dengan angka display font besar.
   - Search bar pill dengan ikon kiri.
   - Feed item: card elevated, nomor nota kecil di atas, customer + tanggal, total kanan besar — tap = buka detail.
   - Empty state ramah (ilustrasi tipografi + CTA "Buat nota pertama").

5. **`src/routes/riwayat.$noteId.tsx`**
   - Back button pill, kartu nota model "receipt" dengan tepi zig-zag halus.
   - Action row sticky di bawah (WA, PNG, Salin, Hapus).

6. **`src/routes/pengaturan.tsx`**
   - Section header gaya iOS Settings (label kecil di atas group card).
   - Group card dengan divider tipis antar baris.
   - Preset list: row dengan drag handle visual + tombol hapus.

7. **`src/components/Receipt.tsx`** (output PNG)
   - Sedikit poles: tipografi konsisten, jarak rapi — visual struk tetap "kertas" netral biar enak dibagikan ke WA.

## Yang TIDAK diubah
- Storage, routing, fitur, format data, alur simpan/share.
- Tidak menambah library baru.
- Tidak mengubah palette (tetap Paper & Ink) atau font (tetap Sora/Manrope).

## Verifikasi
- Cek visual di viewport mobile (375px) dan desktop (≥1024px).
- Pastikan bottom nav floating tidak menutupi CTA simpan di halaman Buat.
- Pastikan tidak ada regresi: simpan nota, share PNG, kirim WA, edit preset.
