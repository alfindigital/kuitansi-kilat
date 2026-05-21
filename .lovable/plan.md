# Rebrand Notaku — Navy & Cream

Ganti palette monokrom jadi brand **navy biru + cream**, samakan tipografi/ukuran di semua halaman, dan pangkas kata-kata yang tidak perlu. Tidak ada perubahan fitur/logic — hanya tampilan.

## 1. Design tokens (src/styles.css)

Palette baru (oklch):
- `--background` cream lembut (≈ `oklch(0.97 0.025 85)`)
- `--surface` cream sedikit lebih dalam untuk chip/segmented
- `--card` cream paling terang (mengapung di atas background)
- `--foreground` navy gelap (≈ `oklch(0.22 0.06 255)`)
- `--primary` navy brand (≈ `oklch(0.34 0.11 258)`) + `--primary-foreground` cream
- `--accent` navy soft tint untuk hover/active nav
- `--border` cream warm (≈ `oklch(0.88 0.02 85)`)
- `--ring` navy brand
- `--muted-foreground` navy ke-50% untuk label sekunder
- Shadow tetap (soft/pop/nav) tapi warna shadow pakai navy alpha rendah agar terasa premium, bukan abu netral
- Dark mode: navy gelap sebagai background, cream sebagai foreground (kebalikan)

## 2. Skala tipografi konsisten (dipakai di semua route)

Satu skala, dipatuhi di semua halaman:
- Page title: `text-2xl font-display font-semibold tracking-tight` (turun dari 3xl agar muat di mobile)
- Section label uppercase: `text-[11px] tracking-[0.12em] text-muted-foreground` (sudah ada — disamakan dipakai konsisten)
- Body input/teks utama: `text-[15px]`
- Helper/secondary: `text-xs text-muted-foreground`
- Angka total besar: `font-display font-semibold text-2xl`
- Tinggi input/tombol seragam: `h-11` (form), `h-12` (CTA utama)
- Radius card: `rounded-2xl`; pill/segmented/CTA: `rounded-full`

Penegasan: hilangkan ukuran ad-hoc lain (`text-3xl` di Buat, ukuran header berbeda di Riwayat/Pengaturan/Detail).

## 3. Pangkas copy

- Buat Nota: hapus subtitle "Catat, simpan, bagikan." → cukup judul "Nota baru". Label "Pelanggan (opsional)" → "Pelanggan". Tombol "Tambah baris" → "Tambah". CTA "Simpan · Rp …" → tetap (informatif).
- ShareSheet: "Nota tersimpan" → "Tersimpan". Tombol "Lihat detail" → "Detail". "Nota baru" → "Baru".
- Riwayat: title cukup "Riwayat", stat chip pakai label pendek "Hari ini" / "Bulan ini" tanpa kalimat panjang. Empty state 1 baris.
- Detail nota: hilangkan label tile ganda; cukup ikon + 1 kata (PNG, Salin, WA).
- Pengaturan: heading section pendek (Bisnis, Preset, Cadangan). Hapus deskripsi panjang.

## 4. Komponen yang disentuh (frontend only)

- `src/styles.css` — token warna + shadow navy alpha
- `src/components/AppShell.tsx` — header tipis pakai brand, bottom nav active state pakai navy soft (`bg-accent text-primary`)
- `src/routes/index.tsx` — landing/redirect samakan styling
- `src/routes/buat.tsx` — skala tipografi, pangkas copy, segmented & CTA pakai primary navy
- `src/routes/riwayat.tsx` — stat chip cream/navy, search pill konsisten, judul kecil
- `src/routes/riwayat.$noteId.tsx` — heading + action tiles seragam, sticky action row pakai primary
- `src/routes/pengaturan.tsx` — section title pendek, divider konsisten
- `src/components/Receipt.tsx` — header struk pakai navy ink di atas cream

## 5. Mobile responsive

- Semua halaman pakai container `max-w-md` (mobile) → `sm:max-w-2xl`
- Padding horizontal `px-4` mobile, `sm:px-6`
- CTA mengambang sudah `max-w-md sm:max-w-2xl` — pertahankan
- Tap target ≥ 40px (`h-10`/`h-11`/`h-12`)
- Bottom nav `safe-area-inset-bottom` (sudah ada — verifikasi)

## 6. Acceptance

- Tidak ada teks hex/warna mentah di komponen — semua via token
- Semua judul halaman pakai kelas yang sama
- Tombol primer = navy brand, teks cream
- Kontras teks/background lulus WCAG AA di light & dark
- Tidak ada fitur baru atau perubahan storage/format

Setelah disetujui, saya implement langsung tanpa lib baru.