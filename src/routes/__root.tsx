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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DbSync } from "@/components/DbSync";

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
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Notaku" },
      { property: "og:locale", content: "id_ID" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Async, non-blocking Google Fonts: load as media="print" so the browser
      // doesn't block render on it, then promote to all media via inline script
      // below once the stylesheet is parsed. (`onLoad` as a string attribute
      // is stripped by React, so we can't rely on the classic onLoad trick.)
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
        media: "print",
        "data-font": "google",
      } as any,
    ],
    scripts: [
      {
        children:
          "(function(){var l=document.querySelector('link[data-font=\"google\"]');if(l){if(l.sheet)l.media='all';else l.addEventListener('load',function(){l.media='all'});}})();",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://notaq.lovable.app/#organization",
              name: "Notaku",
              url: "https://notaq.lovable.app",
              logo: "https://notaq.lovable.app/icon-512.png",
            },
            {
              "@type": "WebSite",
              "@id": "https://notaq.lovable.app/#website",
              url: "https://notaq.lovable.app",
              name: "Notaku",
              description: "Aplikasi nota & struk gratis untuk UMKM Indonesia.",
              inLanguage: "id-ID",
              publisher: { "@id": "https://notaq.lovable.app/#organization" },
            },
            {
              "@type": "SoftwareApplication",
              "@id": "https://notaq.lovable.app/#app",
              name: "Notaku",
              description: "Aplikasi nota dan struk gratis untuk UMKM Indonesia. Catat omset, cetak struk, kirim ke pelanggan via WhatsApp — tanpa login.",
              url: "https://notaq.lovable.app",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              inLanguage: "id-ID",
              offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
            },
          ],
        }),
      },
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
    // Register PWA service worker (no-op inside Lovable preview / iframes)
    import("@/lib/pwa").then((m) => m.registerServiceWorker()).catch(() => undefined);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
      <DbSync />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
