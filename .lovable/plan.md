# Notaku — Full Rebuild Plan

Rebuild the app as a dashboard-first UMKM bookkeeping tool. The existing receipt-builder becomes one feature inside a bigger product. All work is client-side (IndexedDB + Zod), no backend.

## Scope

Apply as a major revision to the current project. Reuse what fits (Receipt component, formatters, WA share, html-to-image), rebuild everything else.

## 1. Data layer (`src/lib/storage.ts`)

Rewrite schemas to spec:
- `PresetSchema` — add `cost` (default 0), `unit` (default "")
- `NoteItemSchema` — add `cost`, allow `qty` decimal (min 0.001)
- `NoteSchema` — add `tags[]`, `note`, `createdAt`, `updatedAt`; collapse discount to single `discount` integer (remove percent/amount split); `customerName`/`customerPhone` default ""
- `BusinessSchema` — add `receiptFooter`, `lastWaNumber`; rename existing `footer` → `receiptFooter` with migration
- `PrefsSchema` — `{ hideAmounts: boolean }` (new key)
- `BackupSchema` — wrap export in `{ app: "notaku", version, exportedAt, data }`
- `SCHEMA_VERSION = 1` with migration hook in `importAll`
- Derived helpers: `deriveCustomers(notes)`, `deriveTags(notes)`, `calcNoteTotals(note)` returning `{subtotal,total,modal,laba}`, `aggregatePeriod(notes, range)` for dashboard

Number format helpers: ensure `Rp50.000` (dot thousands, no space) — update `formatIDR`.

Date format: add `formatDateID` → `Sen, 27 Mei 2026`.

## 2. Navigation (`src/components/AppShell.tsx`)

Replace 3-tab nav with: **Beranda · [FAB +] · Riwayat · Pelanggan**. Center FAB is a prominent circular button linking to `/buat`. Gear icon moves to Beranda header top-right (remove from bottom nav). Remove ThemeToggle (single light theme per spec §11).

Routes to create/rename:
- `/` → Beranda (replace current redirect)
- `/buat` (keep, rebuild form)
- `/riwayat` (keep, rebuild)
- `/riwayat/$noteId` (keep)
- `/pelanggan` (new) + `/pelanggan/$key` (new) — derived, read-only
- `/pengaturan` (keep, rebuild) with sub-sections + `/tentang` (new)

## 3. Screens

**Beranda (`/`)** — new. Two hero cards (Omset, Laba) with `Hari Ini | Bulan Ini` segment toggle, eye-toggle for hide-amounts (persist via `prefs`), 7/30-day bar chart (recharts), 5 latest transactions, hint if any item has cost=0, empty state.

**Buat Nota (`/buat`)** — rebuild:
- Pelanggan: nama + HP, recent-customer chips + autocomplete from `deriveCustomers`
- Tanggal: editable date chip (keep DateChip pattern)
- Item: preset picker (search) + manual add; qty stepper supports decimals; collapsible cost field per line
- Diskon: single nominal field
- Tags: chip input with previously-used suggestions
- Catatan
- Sticky bottom bar: live Total + Simpan
- Draft autosave to localStorage every ~3s, restore prompt on reopen
- Success state with [Lihat Nota] [Kirim WA] [Buat Lagi]

**Riwayat (`/riwayat`)** — search, period chips (Semua/Hari/Minggu/Bulan), tag filter, filtered-set summary (omset + laba), list grouped by date.

**Detail Nota (`/riwayat/$noteId`)** — show laba, actions: Kirim WA, Bagikan Gambar (PNG), Cetak Struk (58/80mm toggle via print CSS), Duplikasi, Edit, Hapus (confirm).

**Pelanggan (`/pelanggan`)** — derived list, search, sort by total/terakhir. Detail page: stats, transaksi list, tombol WA cepat. No CRUD.

**Pengaturan (`/pengaturan`)** — sections: Profil Bisnis, Produk/Preset (CRUD with cost & unit), Tampilan (default hideAmounts), Cadangan Data (Export, Import with Gabung/Timpa choice, Hapus Semua double-confirm), link ke Tentang.

**Tentang (`/tentang`)** — deskripsi + single ad block for Aksel Media Digital + versi app. This is the ONLY place with agency branding.

## 4. Receipt output

Update `Receipt.tsx`: strip all Notaku/agency branding (already clean — verify). Remove any "Powered by". Ensure no pajak/rekening fields exist.

Add print mode component with `@media print` CSS + 58mm/80mm toggle (monospace, ~32/~48 char width).

## 5. PWA

Add `public/manifest.json` (name Notaku, icons 192/512, standalone, portrait, warm theme color), link in `__root.tsx` head. Add minimal service worker (app-shell cache, offline-first) registered only outside Lovable preview iframe per project PWA guidance. One-time "Pasang aplikasi" hint (dismissible, persisted).

## 6. Removals (anti-patterns §14)

- Delete ThemeToggle + dark mode
- Remove existing discount type selector (collapse to single nominal)
- Remove any "customer CRUD" affordance (derived only)
- No onboarding wizard, no backup reminder, no invoice status

## 7. Visual direction

Single light theme, warm cream background, friendly tone. Update `src/styles.css` tokens: warm cream bg, navy ink, accent (e.g. terracotta) for primary. Large touch targets (≥48px), body ≥15px, money ≥18px.

## Technical notes

- Keep `idb-keyval` (already used). Draft autosave uses `localStorage` only.
- Recharts: add `bun add recharts` if not present.
- Number input: keep `parseIDRInput`/`formatIDRInput`, ensure `inputmode="numeric"`.
- Migration: on `getNotes()`, map old shape (`discountType`/`discountValue`) → new `discount` integer; old items without `cost` → 0. Old `business.footer` → `receiptFooter`.
- Customer key: phone if present else lowercased name.
- Tag derivation: union across all notes' `tags[]`, sorted by frequency.

## Out of scope

- Backend, auth, multi-business, dark mode, tax/PPN, utang/piutang, custom domain setup (deploy step §16).

## Open question

The current app is live and has user data in IndexedDB under the old schema. The migration in `getNotes()` handles old→new shape silently, but **existing notes will have `cost=0` everywhere** (laba shows = omset until user backfills modal in Preset / edits items). Acceptable? Or should I show a one-time banner explaining "isi modal di Preset biar laba akurat"?
