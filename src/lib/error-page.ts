// Self-contained HTML fallback for catastrophic SSR failures.
// MUST NOT import any app code — if app code crashes on init,
// this file is the last line of defense.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>Notaku — Halaman gagal dimuat</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f5f3ee" />
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        background: #f5f3ee;
        color: #1a1a1a;
        display: grid;
        place-items: center;
        min-height: 100dvh;
        padding: 1.5rem;
      }
      .card {
        max-width: 26rem;
        width: 100%;
        text-align: center;
        background: #ffffff;
        border: 1px solid #e8e4dd;
        border-radius: 1.25rem;
        padding: 2rem 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
      }
      .logo {
        width: 56px; height: 56px;
        margin: 0 auto 1rem;
        border-radius: 1rem;
        background: #1a1a1a;
        color: #ffffff;
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: 22px;
        letter-spacing: -0.02em;
      }
      h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; letter-spacing: -0.01em; }
      p { color: #6b6b6b; margin: 0 0 1.5rem; font-size: 0.9375rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        padding: 0.625rem 1.125rem;
        border-radius: 0.625rem;
        font: inherit;
        font-weight: 500;
        font-size: 0.9375rem;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .primary { background: #1a1a1a; color: #ffffff; }
      .primary:hover { background: #000; }
      .secondary { background: #ffffff; color: #1a1a1a; border-color: #d4d0c8; }
      .secondary:hover { background: #faf8f5; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">N</div>
      <h1>Halaman gagal dimuat</h1>
      <p>Aplikasi sedang ada gangguan. Coba muat ulang halaman atau kembali ke beranda.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Coba lagi</button>
        <a class="secondary" href="/">Ke beranda</a>
      </div>
    </div>
  </body>
</html>`;
}
