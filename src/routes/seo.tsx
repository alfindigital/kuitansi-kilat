import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

type Status = "passing" | "failing";
type Finding = { id: string; title: string; detail: string; status: Status; action?: { label: string; href: string } };

// Snapshot manual — perbarui setelah scan SEO terbaru di Lovable.
const LAST_SCAN = "2026-05-31";
const FINDINGS: Finding[] = [
  { id: "title", title: "Judul halaman unik per route", detail: "Beranda, Buat, Riwayat, dan Pengaturan punya <title> sendiri.", status: "passing" },
  { id: "desc", title: "Meta description deskriptif", detail: "Setiap route mengisi meta description khusus.", status: "passing" },
  { id: "og", title: "Open Graph & Twitter cards", detail: "og:title, og:description, og:image, twitter:card sudah ada di root.", status: "passing" },
  { id: "robots", title: "robots.txt", detail: "Mengizinkan crawler dan menunjuk ke sitemap.", status: "passing" },
  { id: "sitemap", title: "sitemap.xml", detail: "Berisi semua route publik.", status: "passing" },
  { id: "lang", title: "Atribut lang HTML", detail: "<html lang=\"id\"> ter-set di root shell.", status: "passing" },
  {
    id: "gsc",
    title: "Google Search Console belum terhubung",
    detail: "Butuh otorisasi OAuth Google supaya domain bisa diverifikasi & sitemap dikirim.",
    status: "failing",
    action: { label: "Buka panel SEO Lovable", href: "#" },
  },
];

export const Route = createFileRoute("/seo")({
  head: () => ({
    meta: [
      { title: "Status SEO — Notaku" },
      { name: "description", content: "Ringkasan status SEO Notaku: temuan yang lulus dan yang masih perlu diperbaiki." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Status SEO — Notaku" },
      { property: "og:description", content: "Ringkasan temuan SEO terakhir untuk Notaku." },
    ],
  }),
  component: SeoStatusPage,
});


function SeoStatusPage() {
  const failing = FINDINGS.filter((f) => f.status === "failing");
  const passing = FINDINGS.filter((f) => f.status === "passing");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          to="/pengaturan"
          aria-label="Kembali ke pengaturan"
          className="tap tap-target inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="t-h1">Status SEO</h1>
          <p className="t-caption">Snapshot {LAST_SCAN} · {passing.length} lulus · {failing.length} gagal</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-4">
          <div className="t-eyebrow">Lulus</div>
          <div className="t-display mt-1.5 tabular-nums">{passing.length}</div>
          <div className="t-caption mt-0.5">Pemeriksaan aman</div>
        </div>
        <div className={"rounded-2xl border border-border shadow-soft p-4 " + (failing.length ? "bg-destructive/10" : "bg-accent/40")}>
          <div className="t-eyebrow">Perlu perbaikan</div>
          <div className="t-display mt-1.5 tabular-nums">{failing.length}</div>
          <div className="t-caption mt-0.5">{failing.length ? "Tindak lanjut diperlukan" : "Semua aman"}</div>
        </div>
      </div>

      {failing.length > 0 && (
        <section className="space-y-2">
          <h2 className="t-eyebrow px-1">Masih gagal</h2>
          <ul className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
            {failing.map((f) => (
              <li key={f.id} className="px-4 py-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[15px]">{f.title}</div>
                  <div className="t-caption mt-0.5">{f.detail}</div>
                  {f.action && (
                    <a
                      href={f.action.href}
                      className="tap mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      {f.action.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="t-eyebrow px-1">Lulus</h2>
        <ul className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden divide-y divide-border">
          {passing.map((f) => (
            <li key={f.id} className="px-4 py-3 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[15px]">{f.title}</div>
                <div className="t-caption mt-0.5">{f.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="t-caption px-1">
        Halaman ini snapshot manual. Setelah scan SEO terbaru di Lovable, perbarui daftar di <code>src/routes/seo.tsx</code>.
      </p>
    </div>
  );
}
