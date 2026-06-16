export function Skel({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-muted/50 animate-pulse ${className}`} />;
}

export function SkelCard({ className = "" }: { className?: string }) {
  return <div className={`rounded-2xl bg-card border border-border shadow-soft ${className}`} />;
}

export function SkelHero() {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft p-4 space-y-2">
      <Skel className="h-3 w-12" />
      <Skel className="h-7 w-32" />
      <Skel className="h-3 w-20" />
    </div>
  );
}

export function SkelListItem() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="space-y-1.5 flex-1 min-w-0">
        <Skel className="h-4 w-32" />
        <Skel className="h-3 w-24" />
      </div>
      <Skel className="h-4 w-16" />
    </div>
  );
}
