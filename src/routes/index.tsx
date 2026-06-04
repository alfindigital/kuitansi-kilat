import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FilePlus2 } from "lucide-react";

const OmsetChart = lazy(() => import("@/components/OmsetChart"));

import { db, aggregate, dailyBuckets, calcNoteTotals, hasMissingCost } from "@/lib/storage";
import { formatIDR, formatDateID } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notaku — Catat omset & laba UMKM" },
      { name: "description", content: "Lihat omset, laba, dan transaksi terakhir usaha kamu — gratis, tanpa login." },
      { property: "og:title", content: "Notaku — Catat omset & laba UMKM" },
      { property: "og:description", content: "Dashboard omset & laba untuk warung dan toko kecil." },
      { property: "og:url", content: "https://notaq.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://notaq.lovable.app/" }],
  }),

  component: Beranda,
});

function Beranda() {
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => db.getBusiness() });
  const { data: prefs } = useQuery({ queryKey: ["prefs"], queryFn: () => db.getPrefs() });
  const [range, setRange] = useState<"today" | "month">("today");
  const stats = useMemo(() => aggregate(notes, range), [notes, range]);
  const buckets = useMemo(() => dailyBuckets(notes, 7), [notes]);
  const recent = useMemo(() => [...notes].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5), [notes]);
  const missingCost = useMemo(() => hasMissingCost(notes), [notes]);
  const hide = !!prefs?.hideAmounts;


  return (
    <div className="space-y-5">
      <h1 className="sr-only">{business?.name?.trim() || "Notaku"} — Catat & Cetak Struk UMKM</h1>

      <div className="relative grid grid-cols-2 rounded-full bg-surface p-1 text-sm">
        {(["today", "month"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={
              "tap min-h-9 rounded-full font-medium " +
              (range === r ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")
            }
          >
            {r === "today" ? "Hari Ini" : "Bulan Ini"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HeroCard label="Omset" amount={stats.omset} sub={`${stats.count} nota`} hide={hide} />
        <HeroCard label="Laba" amount={stats.laba} sub={missingCost ? "Sebagian item belum bermodal" : "Laba kotor"} hide={hide} tone="accent" />
      </div>

      {notes.length > 0 && (
        <section className="rounded-2xl bg-card border border-border shadow-soft p-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <h2 className="t-eyebrow">Omset 7 hari</h2>
          </div>
          <div className="h-32">
            <Suspense fallback={<div className="h-full w-full rounded-xl bg-muted/40 animate-pulse" />}>
              <OmsetChart buckets={buckets} />
            </Suspense>
          </div>
        </section>
      )}

      {missingCost && (
        <Link to="/pengaturan" className="block rounded-2xl bg-accent/40 border border-border px-4 py-3 text-sm">
          <div className="font-medium">Isi modal produk biar laba lebih akurat</div>
          <div className="t-caption mt-0.5">Tambahkan harga modal di Preset → laba langsung kehitung.</div>
        </Link>
      )}

      <section className="space-y-2">
        <h2 className="t-eyebrow px-1">Transaksi terbaru</h2>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">Belum ada transaksi</p>
            <p className="t-caption mt-1">Yuk buat nota pertama!</p>
            <Link
              to="/buat"
              className="tap inline-flex items-center gap-1.5 mt-4 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-pop"
            >
              <FilePlus2 className="h-4 w-4" /> Buat nota
            </Link>
          </div>
        ) : (
          <ul className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
            {recent.map((n) => {
              const t = calcNoteTotals(n);
              return (
                <li key={n.id}>
                  <Link
                    to="/riwayat/$noteId"
                    params={{ noteId: n.id }}
                    className="tap flex items-center justify-between px-4 py-3 hover:bg-accent/60"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate text-[15px]">{n.customerName || "Tanpa nama"}</div>
                      <div className="t-caption mt-0.5">{formatDateID(n.date)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="font-display font-semibold tracking-tight tabular-nums">
                        {hide ? "•••" : formatIDR(t.total)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function HeroCard({ label, amount, sub, hide, tone }: { label: string; amount: number; sub: string; hide: boolean; tone?: "accent" }) {
  return (
    <div className={"rounded-2xl border border-border shadow-soft p-4 " + (tone === "accent" ? "bg-accent/40" : "bg-card")}>
      <div className="t-eyebrow">{label}</div>
      <div className="t-display mt-1.5 tabular-nums">{hide ? "•••••" : formatIDR(amount)}</div>
      <div className="t-caption mt-0.5">{sub}</div>
    </div>
  );
}
