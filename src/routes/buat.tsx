import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, X, Check, MessageCircle,
  Image as ImageIcon, Copy, ChevronDown, Calendar,
} from "lucide-react";
import { toast } from "sonner";

import {
  db, calcTotals, generateNoteNumber, uid,
  type Note, type NoteItem, type Preset,
} from "@/lib/storage";
import { formatIDR, formatIDRInput, parseIDRInput, toDateInput } from "@/lib/format";
import { buildReceiptText, renderReceiptPNG, sharePNG, waLink } from "@/lib/receipt";
import { Receipt as ReceiptCard } from "@/components/Receipt";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/buat")({
  head: () => ({
    meta: [
      { title: "Buat Nota — Notaku" },
      { name: "description", content: "Bikin nota dan struk dalam hitungan detik." },
    ],
  }),
  component: BuatPage,
});

type Discount = { type: "none" | "amount" | "percent"; value: number };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </div>
  );
}

const DRAFT_KEY = "notaku:buat-draft:v1";

type Draft = {
  date: string;
  customerName: string;
  customerPhone: string;
  items: NoteItem[];
  discount: Discount;
  updatedAt: number;
};

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

function isDraftEmpty(d: { customerName: string; customerPhone: string; items: NoteItem[]; discount: Discount }) {
  const hasItem = d.items.some((it) => it.name.trim() || it.price > 0);
  return !d.customerName.trim() && !d.customerPhone.trim() && !hasItem && d.discount.type === "none";
}

function BuatPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => db.getBusiness() });
  const { data: presets = [] } = useQuery({ queryKey: ["presets"], queryFn: () => db.getPresets() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });

  const initial = typeof window !== "undefined" ? loadDraft() : null;
  const [date, setDate] = useState<string>(() => initial?.date ?? toDateInput(new Date().toISOString()));
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [items, setItems] = useState<NoteItem[]>(initial?.items?.length ? initial.items : [{ name: "", qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState<Discount>(initial?.discount ?? { type: "none", value: 0 });
  const [savedNote, setSavedNote] = useState<Note | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(initial?.updatedAt ?? null);
  const hadInitialDraft = useRef(!!initial && !isDraftEmpty(initial));

  // Autosave draft (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (savedNote) return; // pause while share sheet is open
    const draft = { date, customerName, customerPhone, items, discount };
    const t = setTimeout(() => {
      if (isDraftEmpty(draft)) {
        localStorage.removeItem(DRAFT_KEY);
        setDraftSavedAt(null);
      } else {
        const updatedAt = Date.now();
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt }));
        setDraftSavedAt(updatedAt);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [date, customerName, customerPhone, items, discount, savedNote]);

  useEffect(() => {
    if (hadInitialDraft.current) {
      toast.success("Draf dipulihkan");
      hadInitialDraft.current = false;
    }
  }, []);


  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string }>();
    for (const n of notes) {
      const nm = n.customerName?.trim();
      if (!nm) continue;
      const key = (n.customerPhone || nm).toLowerCase();
      if (!map.has(key)) map.set(key, { name: nm, phone: n.customerPhone });
    }
    return [...map.values()];
  }, [notes]);

  const suggestions = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [customers, customerName]);

  const { subtotal, total } = useMemo(
    () => calcTotals(items, discount.type, discount.value),
    [items, discount],
  );

  function updateItem(i: number, patch: Partial<NoteItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    setItems((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));
  }
  function addRow() { setItems((a) => [...a, { name: "", qty: 1, price: 0 }]); }
  function addPreset(p: Preset) {
    setItems((a) => {
      const empty = a.findIndex((it) => !it.name && !it.price);
      const row: NoteItem = { name: p.name, qty: 1, price: p.price };
      if (empty >= 0) return a.map((it, i) => (i === empty ? row : it));
      return [...a, row];
    });
  }

  const saveMutation = useMutation({
    mutationFn: async (): Promise<Note> => {
      const cleaned = items.map((it) => ({ ...it, name: it.name.trim() })).filter((it) => it.name);
      if (!cleaned.length) throw new Error("Tambahkan minimal 1 item dengan nama.");
      const seq = (await db.getSeq()) + 1;
      const number = generateNoteNumber(business?.prefix || "NT", seq, new Date(date));
      const totals = calcTotals(cleaned, discount.type, discount.value);
      const note: Note = {
        id: uid(),
        number,
        date: new Date(date + "T" + new Date().toISOString().slice(11, 19)).toISOString(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cleaned,
        discountType: discount.type,
        discountValue: discount.type === "none" ? 0 : discount.value,
        subtotal: totals.subtotal,
        total: totals.total,
      };
      await db.setSeq(seq);
      await db.setNotes([note, ...notes]);
      return note;
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
      setDraftSavedAt(null);
      setSavedNote(note);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function newNota() {
    setSavedNote(null);
    setCustomerName(""); setCustomerPhone("");
    setItems([{ name: "", qty: 1, price: 0 }]);
    setDiscount({ type: "none", value: 0 });
    setDate(toDateInput(new Date().toISOString()));
    if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
    setDraftSavedAt(null);
  }

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold tracking-tight">Nota baru</h1>
        <label className="relative tap inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs text-muted-foreground shadow-soft">
          <Calendar className="h-3.5 w-3.5" />
          <span>{new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
          <input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Customer */}
      <section className="space-y-2">
        <SectionLabel>Pelanggan</SectionLabel>
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
          <div className="relative">
            <input
              placeholder="Nama"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={80}
              className="w-full bg-transparent px-4 h-11 text-[15px] placeholder:text-muted-foreground/70 focus:outline-none"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 left-2 right-2 rounded-xl border border-border bg-popover shadow-pop overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
                    onClick={() => { setCustomerName(s.name); setCustomerPhone(s.phone || ""); }}
                  >
                    <span>{s.name}</span>
                    {s.phone && <span className="text-muted-foreground">{s.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            placeholder="No. WhatsApp"
            inputMode="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+]/g, ""))}
            maxLength={20}
            className="w-full bg-transparent px-4 h-11 text-[15px] placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>
      </section>

      {/* Items */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <SectionLabel>Item</SectionLabel>
          {presets.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="tap text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1">
                  Preset <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1" align="end">
                <div className="max-h-64 overflow-auto">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addPreset(p)}
                      className="tap w-full text-left px-2 py-2 text-sm rounded-lg hover:bg-accent flex justify-between"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-muted-foreground">{formatIDR(p.price)}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="space-y-2">
          {items.map((it, i) => (
            <ItemRow
              key={i}
              item={it}
              onChange={(p) => updateItem(i, p)}
              onRemove={items.length > 1 ? () => removeItem(i) : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="tap w-full inline-flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground rounded-2xl border border-dashed border-border"
        >
          <Plus className="h-4 w-4" /> Tambah
        </button>
      </section>

      {/* Discount */}
      <section className="space-y-2">
        <SectionLabel>Diskon</SectionLabel>
        <div className="relative grid grid-cols-3 rounded-full bg-surface p-1 text-sm">
          {(["none", "amount", "percent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDiscount({ type: t, value: t === "none" ? 0 : discount.value })}
              className={cn(
                "tap py-2 rounded-full font-medium",
                discount.type === t
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground",
              )}
            >
              {t === "none" ? "—" : t === "amount" ? "Rp" : "%"}
            </button>
          ))}
        </div>
        {discount.type !== "none" && (
          <Input
            inputMode="numeric"
            placeholder={discount.type === "percent" ? "0–100" : "0"}
            value={discount.value || ""}
            onChange={(e) => {
              const v = parseIDRInput(e.target.value);
              setDiscount({ type: discount.type, value: discount.type === "percent" ? Math.min(100, v) : v });
            }}
            className="h-11 rounded-xl border-border bg-card shadow-soft"
          />
        )}
      </section>

      {/* Summary */}
      <div className="rounded-2xl bg-card border border-border shadow-soft p-4 space-y-2 text-sm">
        <Row label="Subtotal" value={formatIDR(subtotal)} muted />
        {subtotal !== total && <Row label="Diskon" value={"− " + formatIDR(subtotal - total)} muted />}
        <div className="h-px bg-border my-1" />
        <div className="flex items-end justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display font-semibold text-2xl tracking-tight">{formatIDR(total)}</span>
        </div>
      </div>

      {/* Floating CTA above bottom nav */}
      <div
        className="fixed inset-x-0 z-30 px-5 pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
      >
        <div className="mx-auto max-w-md sm:max-w-2xl pointer-events-auto">
          <Button
            size="lg"
            className="tap w-full h-12 rounded-full shadow-pop text-[15px] font-semibold"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <Check className="h-4 w-4" />
            Simpan · {formatIDR(total)}
          </Button>
        </div>
      </div>

      {savedNote && business && (
        <ShareSheet
          note={savedNote}
          business={business}
          onClose={newNota}
          onOpenDetail={() => navigate({ to: "/riwayat/$noteId", params: { noteId: savedNote.id } })}
        />
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between", muted && "text-muted-foreground")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ItemRow({
  item, onChange, onRemove,
}: { item: NoteItem; onChange: (p: Partial<NoteItem>) => void; onRemove?: () => void }) {
  return (
    <div className="group relative rounded-2xl bg-card border border-border shadow-soft p-3 pr-10 space-y-1.5">
      <input
        placeholder="Nama item"
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
        maxLength={80}
        className="w-full bg-transparent text-[15px] font-medium placeholder:text-muted-foreground/70 focus:outline-none"
      />
      <div className="flex items-center gap-2 text-sm">
        <div className="inline-flex items-center rounded-full bg-surface">
          <button
            type="button"
            onClick={() => onChange({ qty: Math.max(1, item.qty - 1) })}
            className="tap w-8 h-8 grid place-items-center text-muted-foreground"
            aria-label="Kurangi"
          >
            −
          </button>
          <input
            inputMode="numeric"
            value={item.qty}
            onChange={(e) => onChange({ qty: Math.max(1, parseInt(e.target.value.replace(/\D/g, "") || "1", 10)) })}
            className="w-8 text-center bg-transparent focus:outline-none font-medium"
          />
          <button
            type="button"
            onClick={() => onChange({ qty: item.qty + 1 })}
            className="tap w-8 h-8 grid place-items-center text-muted-foreground"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
        <span className="text-muted-foreground">×</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Rp</span>
          <input
            inputMode="numeric"
            placeholder="0"
            value={formatIDRInput(item.price)}
            onChange={(e) => onChange({ price: parseIDRInput(e.target.value) })}
            className="w-full h-9 pl-8 pr-2 bg-surface rounded-full text-right text-sm focus:outline-none"
          />
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="tap absolute top-2 right-2 text-muted-foreground hover:text-destructive p-1.5 rounded-full"
          aria-label="Hapus baris"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ShareSheet({
  note, business, onClose, onOpenDetail,
}: { note: Note; business: import("@/lib/storage").Business; onClose: () => void; onOpenDetail: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const text = useMemo(() => buildReceiptText(note, business), [note, business]);

  async function shareImage() {
    if (!ref.current) return;
    setBusy("img");
    try {
      const url = await renderReceiptPNG(ref.current);
      await sharePNG(url, `${note.number}.png`, text);
    } catch (e) {
      toast.error("Gagal membuat gambar.");
      console.error(e);
    } finally { setBusy(null); }
  }
  async function copyText() {
    await navigator.clipboard.writeText(text);
    toast.success("Teks struk disalin");
  }
  function sendWA() {
    window.open(waLink(note.customerPhone, text), "_blank", "noopener");
  }

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
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Total</div>
            <div className="font-display font-semibold text-2xl tracking-tight mt-1">{formatIDR(note.total)}</div>
            {note.customerName && (
              <div className="text-xs text-muted-foreground mt-1">untuk {note.customerName}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ActionTile icon={<ImageIcon className="h-5 w-5" />} label="PNG" onClick={shareImage} loading={busy === "img"} />
            <ActionTile icon={<Copy className="h-5 w-5" />} label="Salin" onClick={copyText} />
            <ActionTile icon={<MessageCircle className="h-5 w-5" />} label="WA" onClick={sendWA} />
          </div>
          <div className="flex justify-between pt-1">
            <button onClick={onOpenDetail} className="tap text-sm text-muted-foreground hover:text-foreground">
              Detail
            </button>
            <button onClick={onClose} className="tap text-sm inline-flex items-center gap-1 font-medium">
              <X className="h-4 w-4" /> Baru
            </button>
          </div>
        </div>
        <div style={{ position: "fixed", left: -10000, top: 0 }}>
          <ReceiptCard ref={ref} note={note} business={business} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionTile({
  icon, label, onClick, loading,
}: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-card border border-border shadow-soft py-4 text-sm disabled:opacity-60"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
