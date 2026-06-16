import { Loader2, ArrowDown } from "lucide-react";

export function PullToRefreshIndicator({ pull, refreshing, progress }: { pull: number; refreshing: boolean; progress: number }) {
  if (pull <= 0 && !refreshing) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
      style={{ transform: `translateY(${Math.min(pull, 60)}px)`, transition: refreshing ? "transform 200ms ease" : undefined }}
      aria-hidden="true"
    >
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-card border border-border shadow-pop px-3 py-1.5 text-xs text-muted-foreground">
        {refreshing ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…</>
        ) : (
          <><ArrowDown className="h-3.5 w-3.5 transition-transform" style={{ transform: `rotate(${progress >= 1 ? 180 : 0}deg)` }} /> {progress >= 1 ? "Lepas untuk refresh" : "Tarik untuk refresh"}</>
        )}
      </div>
    </div>
  );
}
