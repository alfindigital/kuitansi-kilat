import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, History, Plus, Receipt, Settings, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { db } from "@/lib/storage";

const tabs = [
  { to: "/", label: "Beranda", icon: Home, exact: true },
  { to: "/buat", label: "Buat", icon: Plus },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;


export function AppShell() {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const { data: prefs } = useQuery({ queryKey: ["prefs"], queryFn: () => db.getPrefs() });
  const hide = !!prefs?.hideAmounts;
  const toggleHide = useMutation({
    mutationFn: async () => { await db.setPrefs({ hideAmounts: !hide }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefs"] }),
  });

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-md sm:max-w-2xl px-4 sm:px-6 h-14 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="font-display font-semibold tracking-tight text-[15px]">Notaku</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => toggleHide.mutate()}
              aria-label={hide ? "Tampilkan nominal" : "Sembunyikan nominal"}
              className="tap tap-target inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              {hide ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <Link
              to="/pengaturan"
              aria-label="Pengaturan"
              className="tap tap-target inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md sm:max-w-2xl px-4 sm:px-6 pt-3 pb-32">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="mx-auto w-full max-w-md px-3 pointer-events-auto">
          <div className="grid grid-cols-4 gap-1 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-nav p-2">
            {tabs.map((tab) => (
              <TabButton key={tab.to} tab={tab} pathname={pathname} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

function TabButton({ tab, pathname }: { tab: typeof tabs[number]; pathname: string }) {
  const active = "exact" in tab && tab.exact
    ? pathname === tab.to
    : pathname === tab.to || pathname.startsWith(tab.to + "/");
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      className={cn(
        "tap flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-2xl text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      <span>{tab.label}</span>
    </Link>
  );
}
