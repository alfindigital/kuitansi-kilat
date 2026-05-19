import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, MessageCircle, Image as ImageIcon, Copy } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/storage";
import { formatIDR, formatDateTime } from "@/lib/format";
import { buildReceiptText, renderReceiptPNG, sharePNG, waLink } from "@/lib/receipt";
import { Receipt as ReceiptCard } from "@/components/Receipt";
import { Button } from "@/components/ui/button";

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
    mutationFn: async () => {
      await db.setNotes(notes.filter((n) => n.id !== noteId));
    },
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackLink />
        <button
          onClick={() => { if (confirm("Hapus nota ini?")) del.mutate(); }}
          className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-sm"
        >
          <Trash2 className="h-4 w-4" /> Hapus
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{note.number}</h1>
        <p className="text-sm text-muted-foreground">{formatDateTime(note.date)}</p>
      </div>

      {note.customerName && (
        <div className="rounded-lg border border-border bg-card p-3 text-sm">
          <div className="text-xs text-muted-foreground">Pelanggan</div>
          <div className="font-medium">{note.customerName}</div>
          {note.customerPhone && <div className="text-muted-foreground">{note.customerPhone}</div>}
        </div>
      )}

      <ul className="rounded-lg border border-border bg-card divide-y divide-border">
        {note.items.map((it, i) => (
          <li key={i} className="p-3 flex justify-between text-sm">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-muted-foreground">{it.qty} × {formatIDR(it.price)}</div>
            </div>
            <div className="font-medium">{formatIDR(it.qty * it.price)}</div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-border bg-card p-3 space-y-1 text-sm">
        <Row label="Subtotal" value={formatIDR(note.subtotal)} muted />
        {note.subtotal !== note.total && (
          <Row
            label={note.discountType === "percent" ? `Diskon ${note.discountValue}%` : "Diskon"}
            value={"- " + formatIDR(note.subtotal - note.total)}
            muted
          />
        )}
        <Row label={<span className="font-semibold">Total</span>} value={<span className="font-display font-semibold">{formatIDR(note.total)}</span>} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={shareImage} disabled={busy}>
          <ImageIcon className="h-4 w-4" /> Bagikan PNG
        </Button>
        <Button variant="outline" onClick={copyText}>
          <Copy className="h-4 w-4" /> Salin teks
        </Button>
        <Button className="col-span-2" onClick={sendWA}>
          <MessageCircle className="h-4 w-4" />
          {note.customerPhone ? `Kirim WA ke ${note.customerName || note.customerPhone}` : "Buka WhatsApp"}
        </Button>
      </div>

      <div style={{ position: "fixed", left: -10000, top: 0 }}>
        <ReceiptCard ref={ref} note={note} business={business} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/riwayat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
