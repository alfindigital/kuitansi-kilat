import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, MessageCircle, Image as ImageIcon, Copy } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/storage";
import { formatIDR, formatDateTime } from "@/lib/format";
import { buildReceiptText, renderReceiptPNG, sharePNG, waLink } from "@/lib/receipt";
import { Receipt as ReceiptCard } from "@/components/Receipt";

export const Route = createFileRoute("/riwayat/$noteId")({
  head: () => ({
    meta: [
      { title: "Detail nota — Notaku" },
      { name: "description", content: "Detail nota tersimpan." },
    ],
  }),
  component: NoteDetail,
});

function NoteDetail() {
  const { noteId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => db.getBusiness() });
  const note = notes.find((n) => n.id === noteId);

  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const text = useMemo(() => (note && business ? buildReceiptText(note, business) : ""), [note, business]);

  const del = useMutation({
    mutationFn: async () => { await db.setNotes(notes.filter((n) => n.id !== noteId)); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      navigate({ to: "/riwayat" });
    },
  });

  if (!note || !business) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">Nota tidak ditemukan.</p>
      </div>
    );
  }

  async function shareImage() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const url = await renderReceiptPNG(ref.current);
      await sharePNG(url, `${note!.number}.png`, text);
    } catch (e) { toast.error("Gagal membuat gambar."); console.error(e); }
    finally { setBusy(false); }
  }
  async function copyText() {
    await navigator.clipboard.writeText(text);
    toast.success("Teks disalin");
  }
  function sendWA() {
    window.open(waLink(note!.customerPhone, text), "_blank", "noopener");
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <BackLink />
        <button
          onClick={() => { if (confirm("Hapus nota ini?")) del.mutate(); }}
          className="tap text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-sm rounded-full px-3 py-1.5"
        >
          <Trash2 className="h-4 w-4" /> Hapus
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">{note.number}</h1>
        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(note.date)}</p>
      </div>

      {note.customerName && (
        <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Pelanggan</div>
          <div className="font-medium mt-1">{note.customerName}</div>
          {note.customerPhone && <div className="text-sm text-muted-foreground">{note.customerPhone}</div>}
        </div>
      )}

      <ul className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
        {note.items.map((it, i) => (
          <li key={i} className="px-4 py-3 flex justify-between text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{it.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{it.qty} × {formatIDR(it.price)}</div>
            </div>
            <div className="font-medium">{formatIDR(it.qty * it.price)}</div>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-card border border-border shadow-soft p-4 space-y-2 text-sm">
        <Row label="Subtotal" value={formatIDR(note.subtotal)} muted />
        {note.subtotal !== note.total && (
          <Row
            label={note.discountType === "percent" ? `Diskon ${note.discountValue}%` : "Diskon"}
            value={"− " + formatIDR(note.subtotal - note.total)}
            muted
          />
        )}
        <div className="h-px bg-border my-1" />
        <div className="flex items-end justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display font-semibold text-2xl tracking-tight">{formatIDR(note.total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2">
        <ActionTile icon={<ImageIcon className="h-5 w-5" />} label="PNG" onClick={shareImage} loading={busy} />
        <ActionTile icon={<Copy className="h-5 w-5" />} label="Salin" onClick={copyText} />
        <ActionTile icon={<MessageCircle className="h-5 w-5" />} label="WA" onClick={sendWA} />
      </div>

      <div style={{ position: "fixed", left: -10000, top: 0 }}>
        <ReceiptCard ref={ref} note={note} business={business} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/riwayat"
      className="tap inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5"
    >
      <ArrowLeft className="h-4 w-4" /> Riwayat
    </Link>
  );
}
function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
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
