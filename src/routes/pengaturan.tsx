import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Save, Plus, Trash2, Download, MessageCircle } from "lucide-react";
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
      { name: "description", content: "Atur identitas bisnis, preset item, dan backup data." },
    ],
  }),
  component: PengaturanPage,
});

function PengaturanPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Pengaturan</h1>
      <BusinessSection />
      <PresetSection />
      <CustomerSection />
      <BackupSection />
    </div>
  );
}

function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground/80">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
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
    <Section title="Identitas bisnis" hint="Tampil di header struk.">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex gap-3">
          <label className="w-20 h-20 rounded-md border border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer bg-background">
            {form.logo ? (
              <img src={form.logo} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }}
            />
          </label>
          <div className="flex-1 space-y-2">
            <div>
              <Label className="text-xs">Nama bisnis</Label>
              <Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Warung Sate Pak Ali" />
            </div>
            <div>
              <Label className="text-xs">Telepon</Label>
              <Input value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx" />
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Alamat</Label>
          <Textarea rows={2} value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat singkat" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Prefix nota</Label>
            <Input value={form.prefix} maxLength={10} onChange={(e) => setForm({ ...form, prefix: e.target.value })} />
            <p className="text-[10px] text-muted-foreground mt-1">Mis. {form.prefix || "NT"} → {form.prefix || "NT"}-{new Date().getFullYear()}-0001</p>
          </div>
          <div>
            <Label className="text-xs">Footer struk</Label>
            <Input value={form.footer} maxLength={120} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
          </div>
        </div>
        {form.logo && (
          <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setForm({ ...form, logo: undefined })}>
            Hapus logo
          </button>
        )}
        <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
          <Save className="h-4 w-4" /> Simpan
        </Button>
      </div>
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
    <Section title="Preset item" hint="Item siap pakai saat buat nota.">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
            <Input
              inputMode="numeric" placeholder="0"
              value={formatIDRInput(price)}
              onChange={(e) => setPrice(parseIDRInput(e.target.value))}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        {presets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada preset.</p>
        ) : (
          <ul className="divide-y divide-border">
            {presets.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{formatIDR(p.price)}</div>
                </div>
                <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function CustomerSection() {
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => db.getNotes() });
  const customers = deriveCustomers(notes);

  if (customers.length === 0) return null;

  return (
    <Section title="Pelanggan" hint="Otomatis dari nota. Klik untuk kirim ulang via WA.">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {customers.map((c, i) => (
          <li key={i} className="flex items-center justify-between p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.phone || "—"} · {c.count} nota</div>
            </div>
            {c.phone && (
              <a
                href={waLink(c.phone, `Halo ${c.name}, terima kasih sudah berbelanja.`)}
                target="_blank" rel="noopener"
                className="text-sm inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" /> WA
              </a>
            )}
          </li>
        ))}
      </ul>
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
    <Section title="Backup & restore" hint="Simpan atau pulihkan data dalam format JSON.">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={doExport}><Download className="h-4 w-4" /> Export</Button>
          <Button
            variant="outline"
            onClick={() => {
              const mode = confirm("OK = Replace semua data. Cancel = Merge (tambah, tidak menimpa).") ? "replace" : "merge";
              fileRef.current?.setAttribute("data-mode", mode);
              fileRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" /> Import
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
        <button
          onClick={async () => {
            if (!confirm("Hapus SEMUA data Notaku? Tidak bisa dibatalkan.")) return;
            await db.wipe(); qc.invalidateQueries(); toast.success("Data direset.");
          }}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Reset semua data
        </button>
      </div>
    </Section>
  );
}
