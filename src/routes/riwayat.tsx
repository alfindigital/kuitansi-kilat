import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, ChevronRight, Plus, Tag } from "lucide-react";

import { db, calcNoteTotals, deriveTags, type Note } from "@/lib/storage";
import { formatIDR, formatDate } from "@/lib/format";

type Period = "all" | "day" | "week" | "month";
const PERIODS: { id: Period; label: string }[] = [
  { id: "all", label: "Semua" }, { id: "day", label: "Hari ini" }, { id: "week", label: "Minggu" }, { id: "month", label: "Bulan" },
];

export const Route = createFileRoute("/riwayat")({
  head: () => ({
    meta: [
      { title: "Riwayat — Notaku" },
      { name: "description", content: "Riwayat nota, filter tanggal & tag, rekap omset & laba." },
      { property: "og:title", content: "Riwayat — Notaku" },
      { property: "og:description", content: "Lihat dan filter riwayat nota transaksi bisnis UMKM." },
    ],
  }),
  component: RiwayatPage,
});

function RiwayatPage() {
  const matchRoute = useMatchRoute();
  if (matchRoute({ to: "/riwayat/$noteId" })) return <Outlet />;
  return <RiwayatList />;
}

function RiwayatList() {
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [tag, setTag] = useState<string | null>(null);
  const allTags = useMemo(() => deriveTags(notes), [notes]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - ((now.getDay() + 6) % 7) * 86_400_000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return notes.filter((n) => {
      if (ql) {
        const inItems = n.items.some((it) => it.name.toLowerCase().includes(ql));
        const hit = n.number.toLowerCase().includes(ql)
          || n.customerName.toLowerCase().includes(ql)
          || n.customerPhone.includes(ql)
          || inItems;
        if (!hit) return false;
      }
      if (tag && !n.tags.includes(tag)) return false;
      if (period !== "all") {
        const t = new Date(n.date).getTime();
        if (period === "day" && t < startOfDay) return false;
        if (period === "week" && t < startOfWeek) return false;
        if (period === "month" && t < startOfMonth) return false;
      }
      return true;
    });
  }, [notes, q, period, tag]);

  const summary = useMemo(() => {
    let om = 0, lb = 0;
    for (const n of filtered) { const t = calcNoteTotals(n); om += t.total; lb += t.laba; }
    return { omset: om, laba: lb, count: filtered.length };
  }, [filtered]);

  const groups = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of filtered) {
      const key = n.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Riwayat</h1>

      <div className="rounded-2xl bg-card border border-border shadow-soft p-4 grid grid-cols-3 gap-2">
        <Stat label="Nota" value={String(summary.count)} />
        <Stat label="Omset" value={formatIDR(summary.omset)} />
        <Stat label="Laba" value={formatIDR(summary.laba)} />
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          aria-label="Cari nota"
          placeholder="Cari nama, nomor, item…" value={q} onChange={(e) => setQ(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-full bg-card border border-border shadow-soft text-[15px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
            className={"tap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border " + (period === p.id ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card text-muted-foreground border-border")}>
            {p.label}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {tag && (
            <button onClick={() => setTag(null)} className="tap shrink-0 rounded-full bg-card border border-border px-2.5 py-1 text-[11px]">× Hapus tag</button>
          )}
          {allTags.map((t) => (
            <button key={t.tag} onClick={() => setTag(tag === t.tag ? null : t.tag)}
              className={"tap shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border " + (tag === t.tag ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}>
              <Tag className="h-3 w-3" /> {t.tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <FileText className="h-7 w-7 mx-auto mb-3 text-muted-foreground/60" />
          <p className="font-medium">Belum ada nota</p>
          <Link to="/buat" className="tap inline-flex items-center gap-1.5 mt-4 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-soft">
            <Plus className="h-4 w-4" /> Buat nota
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-2">
              <h2 className="t-eyebrow px-1">{formatDate(dateKey + "T00:00:00")}</h2>
              <ul className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
                {items.map((n) => {
                  const t = calcNoteTotals(n);
                  return (
                    <li key={n.id}>
                      <Link to="/riwayat/$noteId" params={{ noteId: n.id }} className="tap flex items-center justify-between px-4 py-3 hover:bg-accent/60">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-[15px]">{n.customerName || "Tanpa nama"}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {n.number} · {n.items.length} item
                            {n.tags.length > 0 && <span className="ml-1">· {n.tags.join(", ")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="font-display font-semibold tracking-tight tabular-nums">{formatIDR(t.total)}</div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-eyebrow">{label}</div>
      <div className="font-display font-semibold text-base tracking-tight mt-1 tabular-nums">{value}</div>
    </div>
  );
}
