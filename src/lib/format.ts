export function formatIDR(n: number): string {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  const sign = v < 0 ? "-" : "";
  return "Rp" + sign + Math.abs(v).toLocaleString("id-ID");
}

/** Parse free-typed Rp input ("25.000", "Rp 25000", "25,000") into integer. */
export function parseIDRInput(s: string): number {
  if (!s) return 0;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatIDRInput(n: number): string {
  if (!n) return "";
  return Math.round(n).toLocaleString("id-ID");
}

const DOW_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MON_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "Sen, 27 Mei 2026" */
export function formatDateID(iso: string): string {
  const d = new Date(iso);
  return `${DOW_ID[d.getDay()]}, ${d.getDate()} ${MON_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** Backwards-compatible short date used in lists. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MON_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} · ${hh}:${mm}`;
}

export function toDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
