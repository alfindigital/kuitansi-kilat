import { toPng } from "html-to-image";
import type { Business, Note } from "./storage";
import { formatIDR, formatDateTime } from "./format";

export function buildReceiptText(note: Note, business: Business): string {
  const lines: string[] = [];
  if (business.name) lines.push(`*${business.name}*`);
  if (business.address) lines.push(business.address);
  if (business.phone) lines.push(`Telp: ${business.phone}`);
  lines.push("--------------------------------");
  lines.push(`No  : ${note.number}`);
  lines.push(`Tgl : ${formatDateTime(note.date)}`);
  if (note.customerName) lines.push(`Utk : ${note.customerName}`);
  lines.push("--------------------------------");
  for (const it of note.items) {
    lines.push(it.name);
    const left = `  ${it.qty} x ${formatIDR(it.price)}`;
    const right = formatIDR(it.qty * it.price);
    lines.push(padBetween(left, right, 32));
  }
  lines.push("--------------------------------");
  lines.push(padBetween("Subtotal", formatIDR(note.subtotal), 32));
  if (note.discountType !== "none" && note.discountValue > 0) {
    const label = note.discountType === "percent" ? `Diskon ${note.discountValue}%` : "Diskon";
    lines.push(padBetween(label, "- " + formatIDR(note.subtotal - note.total), 32));
  }
  lines.push(padBetween("*TOTAL*", `*${formatIDR(note.total)}*`, 32));
  lines.push("--------------------------------");
  if (business.footer) lines.push(business.footer);
  return lines.join("\n");
}

function padBetween(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(space) + right;
}

export async function renderReceiptPNG(node: HTMLElement): Promise<string> {
  return await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });
}

export function waLink(phone: string | undefined, text: string): string {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  const base = normalized ? `https://wa.me/${normalized}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export async function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function sharePNG(dataUrl: string, filename: string, text?: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return true;
    }
  } catch {
    /* fallthrough */
  }
  await downloadDataUrl(dataUrl, filename);
  return false;
}
