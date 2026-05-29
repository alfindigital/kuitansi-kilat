import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display font-semibold tracking-tight text-7xl text-foreground">404</h1>
        <h2 className="mt-4 t-h2 text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">Halaman ini tidak ada atau sudah dipindah.</p>
        <div className="mt-6">
          <Link
            to="/buat"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="t-h2 text-foreground">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coba muat ulang atau kembali ke beranda.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground"
          >
            Ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#f5f3ee" },
      { title: "Notaku — Catat & Cetak Struk UMKM" },
      { name: "description", content: "Aplikasi sat-set untuk UMKM: bikin nota, cetak struk, simpan riwayat dan pelanggan. Tanpa login, semua data di HP." },
      { property: "og:title", content: "Notaku — Catat & Cetak Struk UMKM" },
      { name: "twitter:title", content: "Notaku — Catat & Cetak Struk UMKM" },
      { property: "og:description", content: "Aplikasi sat-set untuk UMKM: bikin nota, cetak struk, simpan riwayat dan pelanggan. Tanpa login, semua data di HP." },
      { name: "twitter:description", content: "Aplikasi sat-set untuk UMKM: bikin nota, cetak struk, simpan riwayat dan pelanggan. Tanpa login, semua data di HP." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/56f980cb-49b6-49fd-9634-6b0822ea7aab/id-preview-96902810--65563a69-002b-433d-9fc5-fcaf2a9483ec.lovable.app-1779326192088.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/56f980cb-49b6-49fd-9634-6b0822ea7aab/id-preview-96902810--65563a69-002b-433d-9fc5-fcaf2a9483ec.lovable.app-1779326192088.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).__notakuErrLog) return;
    (window as any).__notakuErrLog = true;
    const onError = (e: ErrorEvent) => {
      console.error("[runtime-error]", `${e.filename}:${e.lineno}:${e.colno}`, e.error ?? e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      console.error("[unhandled-rejection]", e.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
