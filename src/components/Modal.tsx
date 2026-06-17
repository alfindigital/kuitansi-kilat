import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BaseProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
};

function Backdrop({ open, onClose, children, labelledBy }: { open: boolean; onClose: () => void; children: React.ReactNode; labelledBy: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-soft p-4 animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open, onClose, title, description, confirmLabel = "Lanjut", cancelLabel = "Batal",
  variant = "default", onConfirm,
}: BaseProps & {
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}) {
  const id = "confirm-modal-title";
  return (
    <Backdrop open={open} onClose={onClose} labelledBy={id}>
      <h2 id={id} className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-line">{description}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className="rounded-full">{cancelLabel}</Button>
        <Button
          onClick={() => { onConfirm(); onClose(); }}
          className={"rounded-full " + (variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "")}
        >
          {confirmLabel}
        </Button>
      </div>
    </Backdrop>
  );
}

export function TypedConfirmModal({
  open, onClose, title, description, keyword, confirmLabel = "Lanjut",
  variant = "destructive", onConfirm,
}: BaseProps & {
  keyword: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = "typed-confirm-title";

  useEffect(() => { if (open) { setValue(""); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const matched = value.trim().toUpperCase() === keyword.toUpperCase();

  return (
    <Backdrop open={open} onClose={onClose} labelledBy={id}>
      <h2 id={id} className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-line">{description}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Ketik <span className="font-mono font-semibold text-foreground">{keyword}</span> untuk konfirmasi:
      </p>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && matched) { onConfirm(); onClose(); } }}
        className="mt-2 h-10 rounded-xl"
        autoCapitalize="characters"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
        <Button
          disabled={!matched}
          onClick={() => { onConfirm(); onClose(); }}
          className={"rounded-full " + (variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "")}
        >
          {confirmLabel}
        </Button>
      </div>
    </Backdrop>
  );
}

export function ChoiceModal({
  open, onClose, title, description, options,
}: BaseProps & {
  options: { label: string; description?: string; onSelect: () => void; variant?: "default" | "destructive" }[];
}) {
  const id = "choice-modal-title";
  return (
    <Backdrop open={open} onClose={onClose} labelledBy={id}>
      <h2 id={id} className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-3 space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => { opt.onSelect(); onClose(); }}
            className={
              "tap w-full text-left rounded-xl border border-border px-3 py-2.5 hover:bg-muted transition-colors " +
              (opt.variant === "destructive" ? "text-destructive" : "")
            }
          >
            <div className="text-sm font-medium">{opt.label}</div>
            {opt.description && <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={onClose} className="rounded-full">Batal</Button>
      </div>
    </Backdrop>
  );
}
