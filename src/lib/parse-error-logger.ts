import type { Plugin } from "vite";

/**
 * Vite plugin: enriches transform/parse errors with file path + line:col so
 * messages like "Unexpected token (124:5)" can be traced instantly. Also
 * captures errors thrown by upstream plugins (e.g. tanstack-router code-splitter,
 * babel parser) that often omit the source file in their message.
 */
export function parseErrorLogger(): Plugin {
  const fmt = (file: string, line?: number, col?: number) =>
    line != null ? `${file}:${line}${col != null ? `:${col}` : ""}` : file;

  return {
    name: "lovable:parse-error-logger",
    enforce: "post",
    async transform(_code, id) {
      // no-op; this hook just ensures we participate in the pipeline
      return null;
    },
    handleHotUpdate({ file }) {
      // give HMR errors a clearer prefix in console
      return undefined;
    },
    configureServer(server) {
      const log = server.config.logger;
      const origError = log.error.bind(log);
      log.error = (msg, opts) => {
        const err = opts?.error as (Error & { loc?: { file?: string; line?: number; column?: number }; id?: string; pos?: number }) | undefined;
        if (err) {
          const file = err.loc?.file || err.id;
          const line = err.loc?.line;
          const col = err.loc?.column;
          if (file) {
            const prefix = `\n[parse-error] ${fmt(file, line, col)}\n`;
            msg = prefix + (typeof msg === "string" ? msg : String(msg));
          }
          if (err.stack) {
            msg = `${msg}\n${err.stack}`;
          }
        }
        return origError(msg, opts);
      };
    },
  };
}
