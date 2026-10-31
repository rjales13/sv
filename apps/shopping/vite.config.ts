import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Vite 7 build/dev/preview config for the shopping app. The monorepo is pinned to Vite 7 for
// peer consistency (Storybook + this app share one Vite), so we deliberately do NOT move to
// Vite 8 or add @rolldown/plugin-babel / the React Compiler here — a divergent major would
// fracture the shared peer graph.
//
// Plugins: @vitejs/plugin-react (the JSX transform + Fast Refresh) and @tailwindcss/vite
// (Tailwind 4's compiler — it turns the imported `@vikings/ui/globals.css` into the real DS
// theme; there is no PostCSS step). The root vitest.config.ts stays the test runner; this
// config never runs tests.
/**
 * Drops MSW's service worker from the production build.
 *
 * `msw` itself is already absent from the bundle — `src/dev/start-dev-mocks.ts` imports it
 * dynamically behind an `import.meta.env.DEV` guard, so the chunk is never emitted. But
 * `public/mockServiceWorker.js` is a static asset and Vite copies `public/` verbatim, which
 * would ship a worker capable of intercepting every request in the Dynamics host. Nothing in
 * a production bundle registers it, so it is inert rather than dangerous — but an unused
 * network interceptor in a deployed artifact is not something to leave for a security review
 * to find.
 */
function excludeMockServiceWorker(): Plugin {
  return {
    name: 'vikings:exclude-mock-service-worker',
    apply: 'build',
    async closeBundle() {
      await rm(fileURLToPath(new URL('dist/mockServiceWorker.js', import.meta.url)), {
        force: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), excludeMockServiceWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  server: {
    fs: {
      // U5's mock adapter imports the committed catavail fixture from the repo-root `context/`
      // dir, which sits OUTSIDE this app package. Vite's dev server refuses to serve files
      // outside the project root by default, so widen the allow-list to the repo root. `vite
      // build` inlines the JSON through the module graph and needs no allowance — this only
      // affects `vite dev`.
      allow: [fileURLToPath(new URL('../../', import.meta.url))],
    },
    // The browser calls the integration layer same-origin at `/api` (ADR-0017); the IL has no
    // CORS by design (ADR-0018). In `vite dev` that origin is this server, so forward `/api` to
    // the local IL (`pnpm --filter integration-layer dev`, port 3001). Only reached when MSW is
    // not answering `/api` itself — see VITE_IL_DEV_MOCKS in .env.example.
    proxy: {
      '/api': process.env.IL_DEV_PROXY_TARGET ?? 'http://localhost:3001',
    },
  },
});
