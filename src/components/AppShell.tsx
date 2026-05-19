import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { FilePlus2, History, Settings, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/buat", label: "Buat", icon: FilePlus2 },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 h-12 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          <span className="font-display font-semibold tracking-tight">Notaku</span>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <nav
        className="fixed bottom-0 inset-x-0 border-t border-border bg-surface/90 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-2xl grid grid-cols-3">
          {tabs.map((t) => {
            const active = pathname === t.to || pathname.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
