import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, History, Plus, Receipt, Settings, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/storage";

const tabs = [
  { to: "/", label: "Beranda", icon: Home, exact: true },
  { to: "/buat", label: "Buat", icon: Plus },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

const THEME_KEY = "notaku-theme";
type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}


export function AppShell() {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const { data: prefs } = useQuery({ queryKey: ["prefs"], queryFn: () => db.getPrefs() });
  const hide = !!prefs?.hideAmounts;
  const { theme, toggle: toggleTheme } = useTheme();
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
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
              aria-pressed={theme === "dark"}
              className="tap tap-target inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
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
          <div className="grid grid-cols-4 gap-1 rounded-full bg-primary text-primary-foreground backdrop-blur-md border border-primary/40 shadow-nav p-2">
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
      preload="render"
      className={cn(
        "tap relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-full text-[11px] font-medium transition-colors",
        active
          ? "bg-background text-primary shadow-soft"
          : "text-primary-foreground/70 hover:text-primary-foreground",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      <span>{tab.label}</span>
    </Link>
  );
}
