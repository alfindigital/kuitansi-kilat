import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Save, Plus, Trash2, Download, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { db, defaultBusiness, deriveCustomers, uid, type Business, type Preset } from "@/lib/storage";
import { formatIDR, formatIDRInput, parseIDRInput } from "@/lib/format";
import { waLink } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Notaku" },
      { name: "description", content: "Atur identitas bisnis, logo, preset item, daftar pelanggan, dan cadangan data Notaku." },
      { property: "og:title", content: "Pengaturan — Notaku" },
      { property: "og:description", content: "Kelola profil bisnis, preset item, pelanggan, dan backup data lokal Notaku." },
    ],
  }),
  component: PengaturanPage,
});

function PengaturanPage() {
  return (
    <div className="space-y-8">
      <h1 className="sr-only">Pengaturan</h1>
      <BusinessSection />
      <PresetSection />
      <CustomerSection />
      <BackupSection />
    </div>
  );
}

function Section({ title, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-card border border-border shadow-soft ${className}`}>
      {children}
    </div>
  );
}

function BusinessSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["business"], queryFn: () => db.getBusiness() });
  const [form, setForm] = useState<Business>(defaultBusiness);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async (b: Business) => { await db.setBusiness(b); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business"] }); toast.success("Tersimpan"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onLogo(file: File) {
    if (file.size > 300_000) { toast.error("Logo maksimum 300KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <Section title="Bisnis">
      <Card className="p-4 space-y-4">
        <div className="flex gap-4">
          <label className="w-20 h-20 rounded-2xl border border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer bg-surface tap" aria-label="Unggah logo bisnis">
            {form.logo ? (
              <img src={form.logo} alt={form.name ? `Logo ${form.name}` : "Logo bisnis"} className="w-full h-full object-contain" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }}
            />
          </label>
          <div className="flex-1 space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nama bisnis</Label>
              <Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Warung Sate Pak Ali" className="h-10 rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telepon</Label>
              <Input value={form.phone} maxLength={20} inputMode="tel" enterKeyHint="done" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx" className="h-10 rounded-xl mt-1" />
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Alamat</Label>
          <Textarea rows={2} value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat singkat" className="rounded-xl mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Prefix nota</Label>
            <Input value={form.prefix} maxLength={10} onChange={(e) => setForm({ ...form, prefix: e.target.value })} className="h-10 rounded-xl mt-1" />
            <p className="text-[10px] text-muted-foreground mt-1">Mis. {form.prefix || "NT"}-{new Date().getFullYear()}-0001</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Footer struk</Label>
            <Input value={form.footer} maxLength={120} onChange={(e) => setForm({ ...form, footer: e.target.value })} className="h-10 rounded-xl mt-1" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          {form.logo ? (
            <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setForm({ ...form, logo: undefined })}>
              Hapus logo
            </button>
          ) : <span />}
          <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="tap rounded-full">
            <Save className="h-4 w-4" /> Simpan
          </Button>
        </div>
      </Card>
    </Section>
  );
}

function PresetSection() {
  const qc = useQueryClient();
  const { data: presets = [] } = useQuery({ queryKey: ["presets"], queryFn: () => db.getPresets() });
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);

  const save = useMutation({
    mutationFn: async (items: Preset[]) => { await db.setPresets(items); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presets"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function add() {
    const nm = name.trim();
    if (!nm) return;
    save.mutate([...presets, { id: uid(), name: nm, price }]);
    setName(""); setPrice(0);
  }
  function remove(id: string) { save.mutate(presets.filter((p) => p.id !== id)); }

  return (
    <Section title="Preset">
      <Card className="p-3 space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} enterKeyHint="next" className="h-11 rounded-xl" />
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
            <Input
              inputMode="decimal" enterKeyHint="done" placeholder="0"
              value={formatIDRInput(price)}
              onChange={(e) => setPrice(parseIDRInput(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button variant="outline" onClick={add} aria-label="Tambah preset item" className="tap rounded-xl h-11 w-11 p-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {presets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Belum ada preset.</p>
        ) : (
          <ul className="divide-y divide-border">
            {presets.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{formatIDR(p.price)}</div>
                </div>
                <button onClick={() => remove(p.id)} aria-label={`Hapus preset ${p.name}`} className="tap tap-target inline-flex items-center justify-center text-muted-foreground hover:text-destructive rounded-full">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
}

function CustomerSection() {
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const customers = deriveCustomers(notes);
  if (customers.length === 0) return null;

  return (
    <Section title="Pelanggan">
      <Card>
        <ul className="divide-y divide-border">
          {customers.map((c, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone || "—"} · {c.count} nota</div>
              </div>
              {c.phone && (
                <a
                  href={waLink(c.phone, `Halo ${c.name}, terima kasih sudah berbelanja.`)}
                  target="_blank" rel="noopener"
                  className="tap text-sm inline-flex items-center gap-1 text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5"
                >
                  <MessageCircle className="h-4 w-4" /> WA
                </a>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

function BackupSection() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notaku-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function doImport(file: File, mode: "merge" | "replace") {
    try {
      const text = await file.text();
      await db.importAll(JSON.parse(text), mode);
      qc.invalidateQueries();
      toast.success("Berhasil import.");
    } catch (e) {
      toast.error("Gagal import: format tidak valid.");
      console.error(e);
    }
  }

  return (
    <Section title="Cadangan">
      <Card className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={doExport} className="tap rounded-xl"><Download className="h-4 w-4" /> Export</Button>
          <Button
            variant="outline"
            className="tap rounded-xl"
            onClick={() => {
              const mode = confirm("OK = Replace semua data. Cancel = Merge (tambah, tidak menimpa).") ? "replace" : "merge";
              fileRef.current?.setAttribute("data-mode", mode);
              fileRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button
            variant="outline"
            className="tap rounded-xl text-destructive hover:text-destructive"
            onClick={async () => {
              if (!confirm("Hapus SEMUA data Notaku? Tidak bisa dibatalkan.")) return;
              await db.wipe(); qc.invalidateQueries(); toast.success("Data direset.");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
        <input
          ref={fileRef} type="file" accept="application/json" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const mode = (fileRef.current?.getAttribute("data-mode") as "merge" | "replace") || "replace";
            if (f) doImport(f, mode);
            e.target.value = "";
          }}
        />
      </Card>
    </Section>
  );
}
