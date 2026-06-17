## Hapus baris "Laba" dari ringkasan /buat

**Lokasi:** `src/routes/buat.tsx` baris 422 — di kartu Summary (di atas tombol Simpan).

**Perubahan:** Hapus baris ini:
```tsx
<Row label="Laba" value={totals.modal > 0 ? formatIDR(totals.laba) : "Belum valid"} muted />
```

Subtotal, Diskon, dan Total tetap. Laba tetap muncul di Riwayat (kartu stat & detail nota) — tidak diubah.

**Catatan:** Modal per item & autosave tetap jalan, jadi laba tetap terhitung otomatis di /riwayat. Cuma tidak ditampilkan saat input nota.