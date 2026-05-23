# Rencana 5 Peningkatan Notaku

Semua perubahan terpusat di `src/routes/buat.tsx`, `src/routes/riwayat.$noteId.tsx`, `src/lib/storage.ts`, dan `src/lib/receipt.ts`. Tidak butuh backend baru — tetap offline-first via IndexedDB.

## 1. Autocomplete pelanggan (nama & HP)

**Sekarang:** Saran muncul hanya saat ketik **Nama**, dan hanya filter by nama.

**Perubahan di `src/routes/buat.tsx`:**
- Bangun daftar `customers` dari `deriveCustomers(notes)` (sudah ada utilitas-nya di `storage.ts`) supaya konsisten dengan halaman Pengaturan, dan sertakan `lastDate` + `count` untuk sortir relevansi.
- Buat satu fungsi `match(q, c)` yang mencocokkan **nama ATAU phone** (case-insensitive, digit-only untuk phone).
- Tampilkan dropdown saran di **dua input** (Nama dan No. WhatsApp), pakai komponen kecil `CustomerSuggest` agar tidak duplikasi.
- Item saran menampilkan nama + HP + badge "Xx nota". Klik = isi kedua field sekaligus.
- Tutup dropdown saat: pilih item, blur (delay 120ms agar klik tertangkap), atau tekan Esc.

## 2. Edit nota lama

**Pola routing:** gunakan search param `?edit=<noteId>` di `/buat` (tidak perlu route baru).

**Perubahan:**
- `src/routes/buat.tsx`:
  - Tambah `validateSearch: z.object({ edit: z.string().optional(), from: z.string().optional() }).parse`.
  - Saat `edit` ada → load `note` dari `notes`, isi state (date, customer, items, discount, note baru: `notes`), simpan `editingId` + `editingNumber` + `editingSeqNumber` (nomor & seq asli).
  - Saat draft autosave aktif → **nonaktifkan** kalau `editingId` ada (hindari menimpa draft baru dengan edit).
  - `saveMutation`:
    - Jika `editingId`: replace note di array (pertahankan `id`, `number`, `date` asli; update field lain). **Tidak** menaikkan `seq`.
    - Jika baru: perilaku sekarang.
  - CTA berubah label: "Simpan perubahan" saat mode edit.
  - Setelah simpan edit → langsung navigate ke `/riwayat/$noteId` (skip ShareSheet) supaya alurnya jelas.
- `src/routes/riwayat.$noteId.tsx`:
  - Tambah tombol "Edit" di header (di samping "Hapus"): `<Link to="/buat" search={{ edit: note.id }}>`.

## 3. Duplikat nota (Buat ulang)

**Pola:** `?from=<noteId>` di `/buat`.

**Perubahan:**
- `src/routes/buat.tsx`: saat `from` ada (dan `edit` tidak ada) → load note sumber, copy `customer`, `items`, `discount`, `notes` ke state; **reset** `date` ke hari ini; jangan set `editingId`. Toast: "Disalin dari {nomor lama}".
- `src/routes/riwayat.$noteId.tsx`: tombol "Buat ulang" di grid aksi (atau di header). Pakai ikon `Copy` (sudah dipakai) — ganti ikon "Salin teks" ke `ClipboardCopy` agar tidak bentrok, atau tempatkan "Buat ulang" sebagai chip terpisah di atas. Final: tempatkan **chip "Buat ulang"** di header dekat tombol Edit untuk menghindari kebingungan dengan "Salin (teks)".

## 4. Qty cepat dengan tombol besar di mobile

**Perubahan di `ItemRow` (`src/routes/buat.tsx`):**
- Ganti tombol −/+ dari `w-8 h-8` menjadi responsif: `w-11 h-11 sm:w-8 sm:h-8` (44px di mobile, tetap kompak di desktop) — memenuhi target Apple HIG.
- Naikkan font angka qty di mobile, dan tambah `select-none` + `active:scale-95` untuk feedback tap.
- Tambah **long-press auto-increment** opsional (sederhana): tahan 400ms → +1 tiap 120ms; lepas → stop. Implementasi via `onPointerDown/Up/Leave` + `setInterval` ref. (Skip jika ingin minimal — sebutkan di review.)
- Pastikan input angka qty tetap dapat diketik manual.

## 5. Catatan per nota

**Schema (`src/lib/storage.ts`):**
- Tambah `notes: z.string().trim().max(200).optional()` di `NoteSchema` (nama field: `notes` agar jelas; tapi nama state di komponen pakai `note` agar tidak bentrok dengan koleksi). Field opsional, jadi data lama tetap valid (Zod akan biarkan undefined).

**Form (`src/routes/buat.tsx`):**
- Tambah section "Catatan" (di atas Summary) dengan `Textarea` 2 baris, placeholder: "Mis. lunas cash, DP 50rb…", `maxLength={200}`, counter kecil di pojok kanan bawah.
- Sertakan di draft autosave & di payload `saveMutation`.

**Detail (`src/routes/riwayat.$noteId.tsx`):**
- Render kartu "Catatan" hanya jika ada isinya, di atas grid item atau di bawah pelanggan.

**Struk (`src/lib/receipt.ts`):**
- Di `buildReceiptText`: jika `note.notes` ada, sisipkan baris `Catatan: {note.notes}` sebelum footer.
- Di `<Receipt>` (`src/components/Receipt.tsx`): tampilkan baris yang sama di area sebelum footer.

## Detail Teknis Ringkas

- **Search params dengan Zod:**
  ```ts
  import { z } from "zod";
  validateSearch: z.object({
    edit: z.string().optional(),
    from: z.string().optional(),
  }).parse,
  ```
- **Migrasi data:** `NoteSchema` cukup tambah field opsional → tidak perlu migrasi eksplisit, file backup lama tetap kompatibel.
- **Tidak ada perubahan halaman Riwayat (list)** kecuali jika ingin menampilkan badge "ada catatan" — di luar scope sekarang.
- **QA checklist (`.lovable/qa-riwayat.md`):** tambah poin:
  - Edit nota tidak menaikkan seq, nomor tetap sama
  - Duplikat mereset tanggal & tidak menulis sebelum disimpan
  - Catatan tampil di detail dan struk (PNG & WA teks)
  - Tombol qty memenuhi 44px di viewport <768px

## Urutan Implementasi
1. Schema `notes` + dukungan struk (paling rendah risiko).
2. Catatan di form & detail.
3. Autocomplete (nama + HP) — extract `CustomerSuggest`.
4. Qty besar di mobile + (opsional) long-press.
5. Search params `?edit` & `?from` + tombol di detail.

Konfirmasi untuk mulai, atau beri tahu jika ingin **long-press qty** dilewati / urutan diubah.
