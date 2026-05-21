import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { FilePlus2, History, Settings, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/buat", label: "Buat", icon: FilePlus2 },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/pengaturan", label: "Atur", icon: Settings },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/75 border-b border-border/60">
        <div className="mx-auto max-w-md sm:max-w-2xl px-4 sm:px-6 h-14 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
            <Receipt className="h-4 w-4" />
          </div>
          <span className="font-display font-semibold tracking-tight text-[15px]">Notaku</span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md sm:max-w-2xl px-4 sm:px-6 pt-5 pb-32">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="mx-auto max-w-xs px-4 pointer-events-auto">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-nav p-1.5">
            {tabs.map((t) => {
              const active = pathname === t.to || pathname.startsWith(t.to + "/");
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "tap flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
