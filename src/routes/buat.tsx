import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Check, MessageCircle, Image as ImageIcon, Copy, ChevronDown } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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

function BuatPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => db.getBusiness() });
  const { data: presets = [] } = useQuery({ queryKey: ["presets"], queryFn: () => db.getPresets() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });

  const [date, setDate] = useState<string>(() => toDateInput(new Date().toISOString()));
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<NoteItem[]>([{ name: "", qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState<Discount>({ type: "none", value: 0 });
  const [savedNote, setSavedNote] = useState<Note | null>(null);

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
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Buat nota</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent text-sm text-muted-foreground border-0 focus:outline-none"
        />
      </div>

      {/* Customer */}
      <section className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pelanggan (opsional)</Label>
        <div className="relative">
          <Input
            placeholder="Nama"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            maxLength={80}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-sm">
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
        <Input
          placeholder="No. HP (WA)"
          inputMode="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+]/g, ""))}
          maxLength={20}
        />
      </section>

      {/* Items */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Item</Label>
          {presets.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  Preset <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1" align="end">
                <div className="max-h-64 overflow-auto">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addPreset(p)}
                      className="w-full text-left px-2 py-2 text-sm rounded hover:bg-accent flex justify-between"
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
          className="w-full inline-flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Tambah baris
        </button>
      </section>

      {/* Discount */}
      <section className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Diskon</Label>
        <div className="flex gap-2">
          {(["none", "amount", "percent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDiscount({ type: t, value: t === "none" ? 0 : discount.value })}
              className={cn(
                "flex-1 py-2 text-sm rounded-md border transition-colors",
                discount.type === t
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {t === "none" ? "Tidak ada" : t === "amount" ? "Rp" : "%"}
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
          />
        )}
      </section>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-1 text-sm">
        <Row label="Subtotal" value={formatIDR(subtotal)} muted />
        {subtotal !== total && <Row label="Diskon" value={"- " + formatIDR(subtotal - total)} muted />}
        <Row label={<span className="font-semibold">Total</span>} value={<span className="font-display font-semibold text-base">{formatIDR(total)}</span>} />
      </div>

      <div className="fixed inset-x-0 bottom-16 px-4 pb-3 pointer-events-none">
        <div className="mx-auto max-w-2xl pointer-events-auto">
          <Button
            size="lg"
            className="w-full h-12 rounded-full shadow-lg"
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
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nama produk / jasa"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={80}
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Hapus baris"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          value={item.qty}
          onChange={(e) => onChange({ qty: Math.max(1, parseInt(e.target.value.replace(/\D/g, "") || "1", 10)) })}
          className="w-16 text-center"
        />
        <span className="text-muted-foreground">×</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
          <Input
            inputMode="numeric"
            placeholder="0"
            value={formatIDRInput(item.price)}
            onChange={(e) => onChange({ price: parseIDRInput(e.target.value) })}
            className="pl-9"
          />
        </div>
      </div>
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
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Nota tersimpan · {note.number}</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            Total <span className="font-semibold">{formatIDR(note.total)}</span>
            {note.customerName ? <> · untuk <span className="font-medium">{note.customerName}</span></> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={shareImage} disabled={busy === "img"}>
              <ImageIcon className="h-4 w-4" /> Bagikan PNG
            </Button>
            <Button variant="outline" onClick={copyText}>
              <Copy className="h-4 w-4" /> Salin teks
            </Button>
            <Button
              className="col-span-2"
              onClick={sendWA}
              disabled={!note.customerPhone && !navigator}
            >
              <MessageCircle className="h-4 w-4" />
              {note.customerPhone ? `Kirim WA ke ${note.customerName || note.customerPhone}` : "Buka WhatsApp"}
            </Button>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={onOpenDetail} className="text-sm text-muted-foreground hover:text-foreground">
              Lihat detail
            </button>
            <button onClick={onClose} className="text-sm inline-flex items-center gap-1">
              <X className="h-4 w-4" /> Buat nota baru
            </button>
          </div>
        </div>
        {/* Off-screen receipt for capture */}
        <div style={{ position: "fixed", left: -10000, top: 0 }}>
          <ReceiptCard ref={ref} note={note} business={business} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
