import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, ChevronRight, Plus } from "lucide-react";

import { db, type Note } from "@/lib/storage";
import { formatIDR, formatDate } from "@/lib/format";

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

type Period = "all" | "day" | "week" | "month";
const PERIODS: { id: Period; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "day", label: "Hari ini" },
  { id: "week", label: "Minggu" },
  { id: "month", label: "Bulan" },
];

function RiwayatList() {
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<Period>("all");

  const stats = useMemo(() => {
    const now = new Date();
    const sameDay = (d: Date) => d.toDateString() === now.toDateString();
    const sameMonth = (d: Date) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    let dayOm = 0, dayCount = 0, monOm = 0, monCount = 0;
    for (const n of notes) {
      const d = new Date(n.date);
      if (sameDay(d)) { dayOm += n.total; dayCount++; }
      if (sameMonth(d)) { monOm += n.total; monCount++; }
    }
    return { dayOm, dayCount, monOm, monCount };
  }, [notes]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - ((now.getDay() + 6) % 7) * 86_400_000; // Senin
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return notes.filter((n) => {
      if (ql) {
        const hit = n.number.toLowerCase().includes(ql)
          || (n.customerName || "").toLowerCase().includes(ql)
          || (n.customerPhone || "").includes(ql);
        if (!hit) return false;
      }
      if (period !== "all") {
        const t = new Date(n.date).getTime();
        if (period === "day" && t < startOfDay) return false;
        if (period === "week" && t < startOfWeek) return false;
        if (period === "month" && t < startOfMonth) return false;
      }
      return true;
    });
  }, [notes, q, period]);


      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <FileText className="h-7 w-7 mx-auto mb-3 text-muted-foreground/60" />
          <p className="font-medium">Belum ada nota</p>
          <Link
            to="/buat"
            className="tap inline-flex items-center gap-1.5 mt-4 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-soft"
          >
            <Plus className="h-4 w-4" /> Buat nota
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-2">
              <div className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {formatDate(dateKey + "T00:00:00")}
              </div>
              <ul className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      to="/riwayat/$noteId"
                      params={{ noteId: n.id }}
                      className="tap flex items-center justify-between px-4 py-3 hover:bg-accent/60"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate text-[15px]">
                          {n.customerName || "Tanpa nama"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {n.number} · {n.items.length} item
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="font-display font-semibold tracking-tight">
                          {formatIDR(n.total)}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, amount, count }: { label: string; amount: number; count: number }) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display font-semibold text-xl tracking-tight mt-1.5">
        {formatIDR(amount)}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{count} nota</div>
    </div>
  );
}

export type { Note };
