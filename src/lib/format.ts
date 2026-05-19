export function formatIDR(n: number): string {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return "Rp " + v.toLocaleString("id-ID");
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

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
