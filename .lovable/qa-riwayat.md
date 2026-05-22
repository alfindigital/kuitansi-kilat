# Checklist Uji Regresi — Halaman Riwayat

Jalankan setelah setiap perubahan pada `src/routes/riwayat.tsx`, `src/routes/riwayat.$noteId.tsx`, atau type/const yang dipakainya.

## 1. Build & parse
- [ ] `bun run build` selesai tanpa `SyntaxError` / `Unexpected token`.
- [ ] Tidak ada warning `[parse-error]` di terminal dev server.
- [ ] `src/routeTree.gen.ts` ter-regenerate (tidak diedit manual).

## 2. Struktur file (penyebab error 124:5 sebelumnya)
- [ ] `type Period` dan `const PERIODS` dideklarasikan di **top-level**, sebelum komponen.
- [ ] Tidak ada `export` pada fungsi komponen (`RiwayatPage`, `RiwayatList`, `StatCard`) — hanya `export const Route` dan `export type`.
- [ ] Hook (`useState`, `useMemo`, `useQuery`, `useMatchRoute`) hanya dipanggil di dalam komponen.
- [ ] Setiap `useMemo`/`useQuery` punya dependency array yang benar.

## 3. Routing
- [ ] `/riwayat` → render daftar nota (HTTP 200).
- [ ] `/riwayat/:noteId` → render detail (Outlet dari parent).
- [ ] Kembali dari detail tidak menyebabkan blank screen.
- [ ] Refresh di `/riwayat/:noteId` tetap render detail.

## 4. Pencarian & filter
- [ ] Search kosong → tampil semua nota.
- [ ] Search by nomor nota, nama, dan HP semuanya match (case-insensitive).
- [ ] Filter periode: `Semua`, `Hari ini`, `Minggu`, `Bulan` mengubah hasil dengan benar.
- [ ] Kombinasi search + periode bekerja simultan.
- [ ] Pill periode aktif punya style `bg-primary text-primary-foreground`.

## 5. Statistik
- [ ] `StatCard` "Hari ini" cocok dengan jumlah nota tanggal hari ini.
- [ ] `StatCard` "Bulan ini" cocok dengan total bulan berjalan.
- [ ] Format mata uang via `formatIDR` (tidak ada angka mentah).

## 6. Empty state
- [ ] Tanpa nota → tampil ikon + tombol "Buat nota" yang link ke `/buat`.
- [ ] Filter yang menghasilkan 0 nota juga menampilkan empty state.

## 7. Grouping
- [ ] Nota dikelompokkan per tanggal (header `formatDate`).
- [ ] Urutan grup mengikuti urutan data (terbaru di atas).

## 8. Responsif & visual
- [ ] Mobile (375px): pill periode bisa di-scroll horizontal tanpa overflow.
- [ ] Tablet/desktop: grid `StatCard` 2 kolom rapi.
- [ ] Font display (`font-display`) konsisten untuk heading & nominal.
- [ ] Tidak ada warna hardcoded — semua via token (`bg-card`, `text-muted-foreground`, dll).

## 9. Console & network
- [ ] Tidak ada `[runtime-error]` atau `[unhandled-rejection]` di console.
- [ ] Tidak ada request 4xx/5xx dari halaman.

## 10. Smoke test akhir
- [ ] Buat nota baru → muncul di Riwayat.
- [ ] Klik nota → buka detail → tombol back kembali ke list dengan state filter/search tetap utuh.
