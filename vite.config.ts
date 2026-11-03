// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { localMessages } from "./local-messages";
import { localAdmin } from "./local-admin";

export default defineConfig({
  tanstackStart: {
    client: { entry: "client" },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: process.env["UNIKO_LOCAL_MESSAGES"] === "true" ? [localAdmin(), localMessages()] : [],
    define: process.env["UNIKO_LOCAL_MESSAGES"] === "true" ? { 'import.meta.env.VITE_LOCAL_ADMIN': 'true' } : {},
    cacheDir: process.env["UNIKO_VITE_CACHE_DIR"] ?? "node_modules/.vite",
    server: { port: 5050, strictPort: true },
  },
});
