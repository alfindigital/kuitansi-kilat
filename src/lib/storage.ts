import { get, set, createStore } from "idb-keyval";
import { z } from "zod";

const store = typeof indexedDB !== "undefined" ? createStore("notaku-db", "kv") : undefined;

const KEYS = {
  business: "business",
  presets: "presets",
  notes: "notes",
  seq: "seq",
} as const;

// ===== Schemas =====
export const BusinessSchema = z.object({
  name: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(20).default(""),
  address: z.string().trim().max(200).default(""),
  prefix: z.string().trim().min(1).max(10).default("NT"),
  logo: z.string().max(500_000).optional(), // data URL
  footer: z.string().trim().max(120).default("Terima kasih"),
});
export type Business = z.infer<typeof BusinessSchema>;

export const PresetSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80),
  price: z.number().int().min(0).max(1_000_000_000),
});
export type Preset = z.infer<typeof PresetSchema>;

export const NoteItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.number().int().min(1).max(9999),
  price: z.number().int().min(0).max(1_000_000_000),
});
export type NoteItem = z.infer<typeof NoteItemSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(), // ISO
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  items: z.array(NoteItemSchema).min(1).max(100),
  discountType: z.enum(["none", "amount", "percent"]).default("none"),
  discountValue: z.number().min(0).max(1_000_000_000).default(0),
  subtotal: z.number().int().min(0),
  total: z.number().int().min(0),
  notes: z.string().trim().max(200).optional(),
});
export type Note = z.infer<typeof NoteSchema>;

// ===== Defaults =====
export const defaultBusiness: Business = {
  name: "",
  phone: "",
  address: "",
  prefix: "NT",
  logo: undefined,
  footer: "Terima kasih",
};

// ===== Generic getter/setter =====
async function kvGet<T>(k: string, fallback: T): Promise<T> {
  if (!store) return fallback;
  try {
    const v = await get<T>(k, store);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
async function kvSet<T>(k: string, v: T): Promise<void> {
  if (!store) return;
  await set(k, v, store);
}

// ===== API =====
export const db = {
  async getBusiness(): Promise<Business> {
    const raw = await kvGet<unknown>(KEYS.business, defaultBusiness);
    return BusinessSchema.parse({ ...defaultBusiness, ...(raw as object) });
  },
  async setBusiness(b: Business) {
    await kvSet(KEYS.business, BusinessSchema.parse(b));
  },
  async getPresets(): Promise<Preset[]> {
    const raw = await kvGet<unknown[]>(KEYS.presets, []);
    return z.array(PresetSchema).parse(raw ?? []);
  },
  async setPresets(p: Preset[]) {
    await kvSet(KEYS.presets, z.array(PresetSchema).parse(p));
  },
  async getNotes(): Promise<Note[]> {
    const raw = await kvGet<unknown[]>(KEYS.notes, []);
    return z.array(NoteSchema).parse(raw ?? []);
  },
  async setNotes(notes: Note[]) {
    await kvSet(KEYS.notes, z.array(NoteSchema).parse(notes));
  },
  async getSeq(): Promise<number> {
    return await kvGet<number>(KEYS.seq, 0);
  },
  async setSeq(n: number) {
    await kvSet(KEYS.seq, n);
  },
  async exportAll() {
    const [business, presets, notes, seq] = await Promise.all([
      this.getBusiness(),
      this.getPresets(),
      this.getNotes(),
      this.getSeq(),
    ]);
    return { version: 1, business, presets, notes, seq };
  },
  async importAll(data: unknown, mode: "merge" | "replace" = "replace") {
    const schema = z.object({
      version: z.number().optional(),
      business: BusinessSchema.optional(),
      presets: z.array(PresetSchema).optional(),
      notes: z.array(NoteSchema).optional(),
      seq: z.number().optional(),
    });
    const parsed = schema.parse(data);
    if (mode === "replace") {
      if (parsed.business) await this.setBusiness(parsed.business);
      if (parsed.presets) await this.setPresets(parsed.presets);
      if (parsed.notes) await this.setNotes(parsed.notes);
      if (typeof parsed.seq === "number") await this.setSeq(parsed.seq);
    } else {
      if (parsed.business) await this.setBusiness(parsed.business);
      if (parsed.presets) {
        const cur = await this.getPresets();
        const ids = new Set(cur.map((x) => x.id));
        await this.setPresets([...cur, ...parsed.presets.filter((p) => !ids.has(p.id))]);
      }
      if (parsed.notes) {
        const cur = await this.getNotes();
        const ids = new Set(cur.map((x) => x.id));
        await this.setNotes([...cur, ...parsed.notes.filter((n) => !ids.has(n.id))]);
      }
      if (typeof parsed.seq === "number") {
        const cur = await this.getSeq();
        await this.setSeq(Math.max(cur, parsed.seq));
      }
    }
  },
  async wipe() {
    await Promise.all([
      kvSet(KEYS.business, defaultBusiness),
      kvSet(KEYS.presets, []),
      kvSet(KEYS.notes, []),
      kvSet(KEYS.seq, 0),
    ]);
  },
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function generateNoteNumber(prefix: string, seq: number, date = new Date()): string {
  const year = date.getFullYear();
  return `${prefix || "NT"}-${year}-${String(seq).padStart(4, "0")}`;
}

export function calcTotals(
  items: NoteItem[],
  discountType: Note["discountType"],
  discountValue: number,
): { subtotal: number; total: number } {
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  let discount = 0;
  if (discountType === "amount") discount = Math.min(discountValue, subtotal);
  else if (discountType === "percent") discount = Math.round((subtotal * Math.min(discountValue, 100)) / 100);
  return { subtotal, total: Math.max(0, subtotal - discount) };
}

/** Distinct customers derived from notes, latest first. */
export function deriveCustomers(notes: Note[]): { name: string; phone?: string; lastDate: string; count: number }[] {
  const map = new Map<string, { name: string; phone?: string; lastDate: string; count: number }>();
  for (const n of notes) {
    const name = n.customerName?.trim();
    if (!name) continue;
    const key = (n.customerPhone || name).toLowerCase();
    const cur = map.get(key);
    if (!cur) map.set(key, { name, phone: n.customerPhone, lastDate: n.date, count: 1 });
    else {
      cur.count += 1;
      if (n.date > cur.lastDate) {
        cur.lastDate = n.date;
        cur.name = name;
        cur.phone = n.customerPhone || cur.phone;
      }
    }
  }
  return [...map.values()].sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
}
