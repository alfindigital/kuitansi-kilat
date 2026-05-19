import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText } from "lucide-react";

import { db, type Note } from "@/lib/storage";
import { formatIDR, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/riwayat")({
  head: () => ({
    meta: [
      { title: "Riwayat — Notaku" },
      { name: "description", content: "Riwayat nota dan rekap omset UMKM." },
    ],
  }),
  component: RiwayatPage,
});

function RiwayatPage() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/riwayat/$noteId" });
  if (isDetail) return <Outlet />;
  return <RiwayatList />;
}

function RiwayatList() {
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const stats = useMemo(() => {
    const now = new Date();
    const sameDay = (d: Date) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    const sameMonth = (d: Date) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    let dayOm = 0, dayCount = 0, dayQty = 0;
    let monOm = 0, monCount = 0, monQty = 0;
    for (const n of notes) {
      const d = new Date(n.date);
      const qty = n.items.reduce((s, it) => s + it.qty, 0);
      if (sameDay(d)) { dayOm += n.total; dayCount++; dayQty += qty; }
      if (sameMonth(d)) { monOm += n.total; monCount++; monQty += qty; }
    }
    return { dayOm, dayCount, dayQty, monOm, monCount, monQty };
  }, [notes]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return notes.filter((n) => {
      if (ql) {
        const hit = n.number.toLowerCase().includes(ql)
          || (n.customerName || "").toLowerCase().includes(ql)
          || (n.customerPhone || "").includes(ql);
        if (!hit) return false;
      }
      if (from && n.date < from) return false;
      if (to && n.date > to + "T23:59:59") return false;
      return true;
    });
  }, [notes, q, from, to]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Riwayat</h1>

      <section className="rounded-lg border border-border bg-card divide-y divide-border">
        <Period label="HARI INI" om={stats.dayOm} count={stats.dayCount} qty={stats.dayQty} />
        <Period label="BULAN INI" om={stats.monOm} count={stats.monCount} qty={stats.monQty} />
      </section>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama atau nomor…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground space-y-1">
          Dari
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          Sampai
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <FileText className="h-6 w-6 mx-auto mb-2 opacity-60" />
          <p>Belum ada nota</p>
          <p className="text-xs mt-1">Buat nota pertamamu dari tab Buat.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((n) => (
            <li key={n.id}>
              <Link
                to="/riwayat/$noteId"
                params={{ noteId: n.id }}
                className="flex items-center justify-between p-3 hover:bg-accent transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{n.customerName || "Tanpa nama"}</div>
                  <div className="text-xs text-muted-foreground">{n.number} · {formatDate(n.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-semibold">{formatIDR(n.total)}</div>
                  <div className="text-xs text-muted-foreground">{n.items.length} item</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Period({ label, om, count, qty }: { label: string; om: number; count: number; qty: number }) {
  return (
    <div className="p-4">
      <div className="text-[10px] tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Omset" value={formatIDR(om)} />
        <Stat label="Nota" value={count.toString()} />
        <Stat label="Qty" value={qty.toString()} />
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-display font-semibold text-lg leading-tight")}>{value}</div>
    </div>
  );
}

export type { Note };
