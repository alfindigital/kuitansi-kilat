import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[render-error]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="t-h2 text-foreground">Terjadi kesalahan tampilan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman ini gagal dirender. Data kamu aman — coba muat ulang.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => { this.reset(); if (typeof window !== "undefined") window.location.reload(); }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Muat ulang
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
}
