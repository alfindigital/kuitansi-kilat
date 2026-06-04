import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, X, Check, MessageCircle, ArrowLeft,
  Image as ImageIcon, Copy, ChevronDown, ChevronRight, Calendar, BookmarkPlus, Tag, StickyNote,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";

import {
  db, calcNoteTotals, deriveCustomers, deriveTags,
  generateNoteNumber, uid,
  type Note, type NoteItem, type Preset,
} from "@/lib/storage";
import { formatIDR, formatIDRInput, parseIDRInput, toDateInput } from "@/lib/format";
import { buildReceiptText, renderReceiptPNG, sharePNG, waLink } from "@/lib/receipt";
import { tapHaptic } from "@/lib/haptic";
import { Receipt as ReceiptCard } from "@/components/Receipt";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type SearchParams = { edit?: string; from?: string };

export const Route = createFileRoute("/buat")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Buat Nota — Notaku" },
      { name: "description", content: "Catat transaksi dan bikin nota sat-set, langsung kirim ke pelanggan." },
      { property: "og:title", content: "Buat Nota — Notaku" },
      { property: "og:description", content: "Catat transaksi dan bikin nota sat-set untuk UMKM." },
      { property: "og:url", content: "https://notaq.lovable.app/buat" },
    ],
    links: [{ rel: "canonical", href: "https://notaq.lovable.app/buat" }],
  }),
  component: BuatPage,
});


const DRAFT_KEY = "notaku:buat-draft:v2";

type Draft = {
  date: string;
  customerName: string;
  customerPhone: string;
  items: NoteItem[];
  discount: number;
  tags: string[];
  noteText: string;
  updatedAt: number;
};

function emptyItem(): NoteItem { return { name: "", qty: 1, price: 0, cost: 0 }; }

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || !Array.isArray(d.items)) return null;
    return d;
  } catch { return null; }
}
function isDraftEmpty(d: Pick<Draft, "customerName" | "customerPhone" | "items" | "discount" | "tags" | "noteText">) {
  const hasItem = d.items.some((it) => it.name.trim() || it.price > 0);
  return !d.customerName.trim() && !d.customerPhone.trim() && !d.noteText.trim() && !hasItem && d.discount === 0 && d.tags.length === 0;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="t-eyebrow px-1">{children}</h2>;
}

function DateChip({ date, onChange }: { date: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const d = new Date(date + "T00:00:00");
  const text = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="tap inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-[12px] text-foreground shadow-soft hover:bg-accent">
          <Calendar className="h-3.5 w-3.5" /><span>{text}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <CalendarPicker
          mode="single"
          selected={d}
          onSelect={(picked) => { if (picked) { onChange(toDateInput(picked.toISOString())); setOpen(false); } }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

function BuatPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const editingId = search.edit;
  const fromId = search.from;
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => db.getBusiness() });
  const { data: presets = [] } = useQuery({ queryKey: ["presets"], queryFn: () => db.getPresets() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });

  const initial = typeof window !== "undefined" && !editingId && !fromId ? loadDraft() : null;
  const [date, setDate] = useState<string>(() => initial?.date ?? toDateInput(new Date().toISOString()));
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [items, setItems] = useState<NoteItem[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [discount, setDiscount] = useState<number>(initial?.discount ?? 0);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [noteText, setNoteText] = useState(initial?.noteText ?? "");
  const [savedNote, setSavedNote] = useState<Note | null>(null);
  const hadInitialDraft = useRef(!!initial && !isDraftEmpty({ customerName: initial.customerName, customerPhone: initial.customerPhone, items: initial.items, discount: initial.discount, tags: initial.tags ?? [], noteText: initial.noteText }));
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = editingId ? `e:${editingId}` : fromId ? `f:${fromId}` : null;
    if (!key || loadedKeyRef.current === key || !notes.length) return;
    const src = notes.find((n) => n.id === (editingId || fromId));
    if (!src) return;
    loadedKeyRef.current = key;
    if (editingId) {
      setDate(toDateInput(src.date)); setEditingNumber(src.number);
    } else {
      setDate(toDateInput(new Date().toISOString())); setEditingNumber(null);
      toast.success(`Disalin dari ${src.number}`);
    }
    setCustomerName(src.customerName); setCustomerPhone(src.customerPhone);
    setItems(src.items.map((it) => ({ ...it })));
    setDiscount(src.discount);
    setTags([...src.tags]);
    setNoteText(src.note);
  }, [editingId, fromId, notes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (savedNote || editingId || fromId) return;
    const draft = { date, customerName, customerPhone, items, discount, tags, noteText };
    const t = setTimeout(() => {
      if (isDraftEmpty(draft)) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
    }, 400);
    return () => clearTimeout(t);
  }, [date, customerName, customerPhone, items, discount, tags, noteText, savedNote, editingId, fromId]);

  useEffect(() => {
    if (hadInitialDraft.current) { toast.success("Draf dipulihkan"); hadInitialDraft.current = false; }
  }, []);

  const customers = useMemo(() => deriveCustomers(notes), [notes]);
  const allTags = useMemo(() => deriveTags(notes), [notes]);

  function matchCustomer(q: string, c: { name: string; phone?: string }) {
    const s = q.trim().toLowerCase(); if (!s) return false;
    if (c.name.toLowerCase().includes(s)) return true;
    const digits = s.replace(/\D/g, "");
    if (digits && c.phone && c.phone.replace(/\D/g, "").includes(digits)) return true;
    return false;
  }
  const nameSuggestions = useMemo(() => (customerName.trim() ? customers.filter((c) => matchCustomer(customerName, c)).slice(0, 5) : []), [customers, customerName]);
  const phoneSuggestions = useMemo(() => (customerPhone.trim() ? customers.filter((c) => matchCustomer(customerPhone, c)).slice(0, 5) : []), [customers, customerPhone]);
  const recentCustomers = useMemo(() => [...customers].sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1)).slice(0, 4), [customers]);

  const totals = useMemo(() => calcNoteTotals({ items, discount }), [items, discount]);

  function updateItem(i: number, patch: Partial<NoteItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) { setItems((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i))); }
  function addRow() { setItems((a) => [...a, emptyItem()]); }
  function addPreset(p: Preset) {
    setItems((a) => {
      const empty = a.findIndex((it) => !it.name && !it.price);
      const row: NoteItem = { name: p.name, qty: 1, price: p.price, cost: p.cost };
      if (empty >= 0) return a.map((it, i) => (i === empty ? row : it));
      return [...a, row];
    });
  }

  const savePresetMutation = useMutation({
    mutationFn: async (it: NoteItem) => {
      const cur = await db.getPresets();
      const exists = cur.some((p) => p.name.trim().toLowerCase() === it.name.trim().toLowerCase() && p.price === it.price);
      if (exists) return { skipped: true as const, name: it.name };
      await db.setPresets([...cur, { id: uid(), name: it.name.trim(), price: it.price, cost: it.cost || 0, unit: "" }]);
      return { skipped: false as const, name: it.name };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["presets"] });
      tapHaptic(15);
      if (r.skipped) toast.info(`"${r.name}" sudah ada di preset`);
      else toast.success(`"${r.name}" disimpan ke preset`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (): Promise<Note> => {
      const cleaned = items.map((it) => ({ ...it, name: it.name.trim() })).filter((it) => it.name);
      if (!cleaned.length) throw new Error("Tambahkan minimal 1 item dengan nama.");
      const now = new Date().toISOString();
      if (editingId) {
        const existing = notes.find((n) => n.id === editingId);
        if (!existing) throw new Error("Nota tidak ditemukan.");
        const updated: Note = {
          ...existing,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cleaned,
          discount,
          tags,
          note: noteText.trim(),
          date: new Date(date + "T" + new Date(existing.date).toISOString().slice(11, 19)).toISOString(),
          updatedAt: now,
        };
        await db.setNotes(notes.map((n) => (n.id === editingId ? updated : n)));
        return updated;
      }
      const seq = (await db.getSeq()) + 1;
      const number = generateNoteNumber(business?.prefix || "NT", seq, new Date(date));
      const note: Note = {
        id: uid(), number,
        date: new Date(date + "T" + new Date().toISOString().slice(11, 19)).toISOString(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cleaned, discount, tags, note: noteText.trim(),
        createdAt: now, updatedAt: now,
      };
      await db.setSeq(seq);
      await db.setNotes([note, ...notes]);
      if (customerPhone.trim() && business) await db.setBusiness({ ...business, lastWaNumber: customerPhone.trim() });
      return note;
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
      tapHaptic(20);
      if (editingId) { toast.success("Perubahan disimpan"); navigate({ to: "/riwayat/$noteId", params: { noteId: note.id } }); }
      else setSavedNote(note);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function newNota() {
    setSavedNote(null); setCustomerName(""); setCustomerPhone("");
    setItems([emptyItem()]); setDiscount(0); setTags([]); setNoteText("");
    setDate(toDateInput(new Date().toISOString()));
    if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Buat Nota Baru</h1>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link to="/" className="tap inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground rounded-full px-1 py-1">
          <ArrowLeft className="h-4 w-4" /> {editingId ? "Batal" : "Beranda"}
        </Link>
        <DateChip date={date} onChange={setDate} />
      </div>

      {editingId && editingNumber && (
        <div className="t-caption px-1">Mengedit {editingNumber}</div>
      )}

      {/* Customer */}
      <section className="space-y-1.5">
        <SectionLabel>Pelanggan</SectionLabel>
        {!editingId && recentCustomers.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {recentCustomers.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => { setCustomerName(c.name); setCustomerPhone(c.phone); tapHaptic(); }}
                className="tap shrink-0 rounded-full bg-card border border-border px-3 py-1 text-xs shadow-soft hover:bg-accent"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
          <CustomerSuggestInput placeholder="Nama" value={customerName} onChange={setCustomerName} suggestions={nameSuggestions} onPick={(c) => { setCustomerName(c.name); setCustomerPhone(c.phone || ""); }} maxLength={60} />
          <CustomerSuggestInput placeholder="No. WhatsApp (opsional)" value={customerPhone} onChange={(v) => setCustomerPhone(v.replace(/[^\d+]/g, ""))} suggestions={phoneSuggestions} onPick={(c) => { setCustomerName(c.name); setCustomerPhone(c.phone || ""); }} maxLength={20} inputMode="tel" />
        </div>
      </section>

      {/* Items */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <SectionLabel>Item</SectionLabel>
          {(() => {
            const savable = items.filter((it) => it.name.trim() && it.price > 0 && !presets.some((p) => p.name.trim().toLowerCase() === it.name.trim().toLowerCase() && p.price === it.price));
            if (presets.length === 0 && savable.length === 0) return null;
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="tap inline-flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-foreground shadow-soft hover:bg-accent">
                    <BookmarkPlus className="h-3 w-3" /> Preset <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-1.5" align="end">
                  <div className="max-h-80 overflow-auto space-y-2">
                    {presets.length > 0 && (
                      <div>
                        <div className="px-2 pt-1 pb-1 t-eyebrow">Pilih preset</div>
                        <div className="space-y-0.5">
                          {presets.map((p) => (
                            <button key={p.id} onClick={() => addPreset(p)} className="tap w-full text-left px-2 py-2 text-sm rounded-lg hover:bg-accent flex justify-between gap-2">
                              <span className="truncate">{p.name}</span>
                              <span className="text-muted-foreground shrink-0">{formatIDR(p.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {savable.length > 0 && (
                      <div>
                        <div className="px-2 pt-1 pb-1 t-eyebrow">Simpan ke preset</div>
                        <div className="space-y-0.5">
                          {savable.map((it, idx) => (
                            <button key={`${it.name}-${idx}`} onClick={() => savePresetMutation.mutate(it)} className="tap w-full text-left px-2 py-2 text-sm rounded-lg hover:bg-accent flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 min-w-0">
                                <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{it.name}</span>
                              </span>
                              <span className="text-muted-foreground shrink-0">{formatIDR(it.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })()}
        </div>

        <div className="space-y-2">
          {items.map((it, i) => {
            const isPreset = presets.some((p) => p.name.trim().toLowerCase() === it.name.trim().toLowerCase() && p.price === it.price);
            const canSave = !!it.name.trim() && it.price > 0 && !isPreset;
            return (
              <ItemRow
                key={i}
                item={it}
                onChange={(p) => updateItem(i, p)}
                onRemove={items.length > 1 ? () => removeItem(i) : undefined}
                onSavePreset={canSave ? () => savePresetMutation.mutate(it) : undefined}
                isPreset={isPreset}
              />
            );
          })}
        </div>
        <button type="button" onClick={addRow} className="tap w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-2xl border border-dashed border-border">
          <Plus className="h-4 w-4" /> Tambah
        </button>
      </section>

      {/* Inline chips: Diskon, Tag, Catatan */}
      <ExtrasRow
        discount={discount}
        setDiscount={setDiscount}
        tags={tags}
        setTags={setTags}
        tagSuggestions={allTags.map((t) => t.tag)}
        noteText={noteText}
        setNoteText={setNoteText}
      />


      {/* Summary */}
      <div className="rounded-2xl bg-card border border-border shadow-soft p-3 space-y-1.5 text-sm">
        <Row label="Subtotal" value={formatIDR(totals.subtotal)} muted />
        {discount > 0 && <Row label="Diskon" value={"− " + formatIDR(discount)} muted />}
        {totals.modal > 0 && <Row label="Laba" value={formatIDR(totals.laba)} muted />}
        <div className="h-px bg-border my-1" />
        <div className="flex items-end justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display font-semibold text-2xl tracking-tight tabular-nums">{formatIDR(totals.total)}</span>
        </div>
      </div>

      <Button size="lg" className="tap w-full h-12 rounded-full shadow-pop text-[15px] font-semibold" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        <Check className="h-4 w-4" />
        {editingId ? "Simpan perubahan" : "Simpan"}
      </Button>

      {savedNote && business && (
        <ShareSheet note={savedNote} business={business} onClose={newNota} onOpenDetail={() => navigate({ to: "/riwayat/$noteId", params: { noteId: savedNote.id } })} />
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return <div className={cn("flex justify-between", muted && "text-muted-foreground")}><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

function ItemRow({ item, onChange, onRemove, onSavePreset, isPreset }: { item: NoteItem; onChange: (p: Partial<NoteItem>) => void; onRemove?: () => void; onSavePreset?: () => void; isPreset?: boolean }) {
  const [showCost, setShowCost] = useState(item.cost > 0);
  return (
    <div className="group relative rounded-2xl bg-card border border-border shadow-soft p-3 pr-12 space-y-2">
      <input
        aria-label="Nama item"
        placeholder="Nama item" value={item.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={60} enterKeyHint="next"
        className="w-full h-11 px-3 bg-surface rounded-full text-[15px] font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
      <div className="flex items-center gap-2 text-sm">
        <div className="inline-flex items-center rounded-full bg-surface">
          <button type="button" onClick={() => { tapHaptic(); onChange({ qty: Math.max(1, item.qty - 1) }); }} className="tap w-11 h-11 grid place-items-center text-muted-foreground text-lg active:scale-95 select-none" aria-label="Kurangi">−</button>
          <input
            inputMode="decimal" enterKeyHint="next" value={item.qty}
            onChange={(e) => { const v = parseFloat(e.target.value.replace(",", ".")); onChange({ qty: Number.isFinite(v) && v > 0 ? v : 1 }); }}
            onFocus={(e) => e.target.select()}
            className="w-12 text-center bg-transparent focus:outline-none font-medium tabular-nums text-base"
          />
          <button type="button" onClick={() => { tapHaptic(); onChange({ qty: item.qty + 1 }); }} className="tap w-11 h-11 grid place-items-center text-muted-foreground text-lg active:scale-95 select-none" aria-label="Tambah">+</button>
        </div>
        <span className="text-muted-foreground">×</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Rp</span>
          <input
            inputMode="decimal" enterKeyHint="next" placeholder="0"
            value={formatIDRInput(item.price)} onChange={(e) => onChange({ price: parseIDRInput(e.target.value) })}
            onFocus={(e) => e.target.select()}
            className="w-full h-11 pl-8 pr-2 bg-surface rounded-full text-right text-sm focus:outline-none"
          />
        </div>
      </div>
      {showCost ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0 pl-1">Modal</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">Rp</span>
            <input
              inputMode="decimal" placeholder="0"
              value={formatIDRInput(item.cost)} onChange={(e) => onChange({ cost: parseIDRInput(e.target.value) })}
              onFocus={(e) => e.target.select()}
              className="w-full h-9 pl-7 pr-2 bg-surface rounded-full text-right focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowCost(true)} className="text-[11px] text-muted-foreground hover:text-foreground pl-1">+ modal (opsional)</button>
      )}
      {onRemove && (
        <button type="button" onClick={() => { tapHaptic(); onRemove(); }} className="tap tap-target absolute top-1 right-1 inline-flex items-center justify-center text-muted-foreground hover:text-destructive rounded-full" aria-label="Hapus baris">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function TagInput({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState("");
  function add(t: string) {
    const k = t.trim(); if (!k) return;
    if (value.includes(k)) return;
    onChange([...value, k.slice(0, 20)]); setText("");
  }
  function remove(t: string) { onChange(value.filter((x) => x !== t)); }
  const sugs = suggestions.filter((s) => !value.includes(s) && (!text || s.toLowerCase().includes(text.toLowerCase()))).slice(0, 6);
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft p-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2.5 py-1 text-xs">
            <Tag className="h-3 w-3" /> {t}
            <button onClick={() => remove(t)} aria-label={`Hapus tag ${t}`} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); } }}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length ? "" : "mis. catering, jasa, dagangan"}
          maxLength={20}
          className="flex-1 min-w-[120px] bg-transparent text-sm h-8 px-2 focus:outline-none"
        />
      </div>
      {sugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pb-1">
          {sugs.map((s) => (
            <button key={s} onClick={() => add(s)} className="tap rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareSheet({ note, business, onClose, onOpenDetail }: { note: Note; business: import("@/lib/storage").Business; onClose: () => void; onOpenDetail: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const text = useMemo(() => buildReceiptText(note, business), [note, business]);
  const totals = calcNoteTotals(note);

  async function shareImage() {
    if (!ref.current) return;
    setBusy("img");
    try { const url = await renderReceiptPNG(ref.current); await sharePNG(url, `${note.number}.png`, text); }
    catch (e) { toast.error("Gagal membuat gambar."); console.error(e); }
    finally { setBusy(null); }
  }
  async function copyText() { await navigator.clipboard.writeText(text); toast.success("Teks struk disalin"); }
  function sendWA() { window.open(waLink(note.customerPhone, text), "_blank", "noopener"); }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border">
        <div className="mx-auto h-1 w-10 rounded-full bg-border mb-3" />
        <SheetHeader className="text-left">
          <SheetTitle className="font-display tracking-tight text-lg">Tersimpan</SheetTitle>
          <p className="text-xs text-muted-foreground">{note.number}</p>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <div className="rounded-2xl bg-surface p-4">
            <div className="t-eyebrow">Total</div>
            <div className="font-display font-semibold text-2xl tracking-tight mt-1 tabular-nums">{formatIDR(totals.total)}</div>
            {note.customerName && <div className="text-xs text-muted-foreground mt-1">untuk {note.customerName}</div>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ActionTile icon={<ImageIcon className="h-5 w-5" />} label="PNG" onClick={shareImage} loading={busy === "img"} />
            <ActionTile icon={<Copy className="h-5 w-5" />} label="Salin" onClick={copyText} />
            <ActionTile icon={<MessageCircle className="h-5 w-5" />} label="WA" onClick={sendWA} />
          </div>
          <div className="flex justify-between pt-1">
            <button onClick={onOpenDetail} className="tap text-sm text-muted-foreground hover:text-foreground">Lihat detail</button>
            <button onClick={onClose} className="tap text-sm inline-flex items-center gap-1 font-medium"><X className="h-4 w-4" /> Buat lagi</button>
          </div>
        </div>
        <div style={{ position: "fixed", left: -10000, top: 0 }}>
          <ReceiptCard ref={ref} note={note} business={business} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionTile({ icon, label, onClick, loading }: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={() => { tapHaptic(); onClick(); }} disabled={loading} className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card border border-border shadow-soft py-4 text-sm disabled:opacity-60">
      {icon}<span>{label}</span>
    </button>
  );
}

type CustomerLite = { name: string; phone?: string; count?: number };
function CustomerSuggestInput({ placeholder, value, onChange, suggestions, onPick, maxLength, inputMode }: { placeholder: string; value: string; onChange: (v: string) => void; suggestions: CustomerLite[]; onPick: (c: CustomerLite) => void; maxLength?: number; inputMode?: "tel" | "text" | "numeric"; }) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(true);
  const show = focused && open && suggestions.length > 0;
  return (
    <div className="relative">
      <input
        aria-label={placeholder}
        placeholder={placeholder} value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        maxLength={maxLength} inputMode={inputMode} enterKeyHint="next"
        className="w-full bg-transparent px-4 h-11 text-[15px] placeholder:text-muted-foreground/70 focus:outline-none"
      />
      {show && (
        <div className="absolute z-20 mt-1 left-2 right-2 rounded-xl border border-border bg-popover shadow-pop overflow-hidden">
          {suggestions.map((s, i) => (
            <button key={i} type="button" className="tap w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(s); setOpen(false); }}>
              <span className="truncate">
                <span className="font-medium">{s.name}</span>
                {s.phone && <span className="text-muted-foreground ml-2">{s.phone}</span>}
              </span>
              {typeof s.count === "number" && <span className="text-[10px] text-muted-foreground shrink-0">{s.count}× nota</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
