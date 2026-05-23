import { forwardRef } from "react";
import type { Business, Note } from "@/lib/storage";
import { formatIDR, formatDateTime } from "@/lib/format";

interface Props { note: Note; business: Business }

export const Receipt = forwardRef<HTMLDivElement, Props>(function Receipt({ note, business }, ref) {
  const discount = note.subtotal - note.total;
  return (
    <div
      ref={ref}
      style={{
        width: 360,
        background: "#fbf6ec",
        color: "#1a2a4a",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: 20,
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {business.logo ? (
          <img src={business.logo} alt="" style={{ height: 40, margin: "0 auto 6px", display: "block" }} />
        ) : null}
        {business.name ? (
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>{business.name}</div>
        ) : null}
        {business.address ? <div style={{ fontSize: 11 }}>{business.address}</div> : null}
        {business.phone ? <div style={{ fontSize: 11 }}>Telp {business.phone}</div> : null}
      </div>
      <Divider />
      <Row left="No" right={note.number} />
      <Row left="Tgl" right={formatDateTime(note.date)} />
      {note.customerName ? <Row left="Untuk" right={note.customerName} /> : null}
      <Divider />
      {note.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <div>{it.name}</div>
          <Row left={`  ${it.qty} × ${formatIDR(it.price)}`} right={formatIDR(it.qty * it.price)} />
        </div>
      ))}
      <Divider />
      <Row left="Subtotal" right={formatIDR(note.subtotal)} />
      {discount > 0 ? (
        <Row
          left={note.discountType === "percent" ? `Diskon ${note.discountValue}%` : "Diskon"}
          right={"- " + formatIDR(discount)}
        />
      ) : null}
      <Row left={<strong>TOTAL</strong>} right={<strong>{formatIDR(note.total)}</strong>} bold />
      <Divider />
      {note.notes ? (
        <div style={{ marginTop: 4, fontStyle: "italic" }}>Catatan: {note.notes}</div>
      ) : null}
      {business.footer ? (
        <div style={{ textAlign: "center", marginTop: 6 }}>{business.footer}</div>
      ) : null}
    </div>
  );
});

function Divider() {
  return <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />;
}

function Row({ left, right, bold }: { left: React.ReactNode; right: React.ReactNode; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontWeight: bold ? 700 : 400 }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
