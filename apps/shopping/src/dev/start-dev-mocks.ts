// Starts MSW in the browser so `pnpm dev` runs the app against wire-shaped EVO payloads
// (ADR-0008) — including the ~600ms think-time that makes FR4's loading state visible. The
// in-process mock adapter resolves synchronously and can never show one.
//
// The shape here matters as much as the behaviour:
//
//  - **Both imports are dynamic**, so `msw` and the handler kit live in a dev-only chunk and
//    are absent from a production bundle. A static import would ship a service-worker
//    library to every agent.
//  - **Idempotent**, because React StrictMode double-invokes effects in dev and the worker
//    must start at most once.
//  - **Never fatal.** A mock that fails to start should degrade to "no mocking" — the app
//    still boots against whatever the provider is — rather than blanking the page.

let started: Promise<void> | undefined;

/** Resolves once the worker is running (or once we've decided to carry on without it). */
export function startDevMocks(baseUrl: string): Promise<void> {
  started ??= start(baseUrl);
  return started;
}

async function start(baseUrl: string): Promise<void> {
  try {
    const [
      { setupWorker },
      {
        makeAirHandlers,
        makeEvoHandlers,
        makeExtensionsHandlers,
        makeIntegrationLayerHandlers,
        makeItineraryHandlers,
        makeStateroomHandlers,
      },
    ] = await Promise.all([import('msw/browser'), import('@vikings/adapters/msw')]);

    // Env-driven so Playwright can run at 0 and skip 600ms per call across the whole suite,
    // while the dev server keeps the think-time that makes FR4's loading state visible.
    const latencyMs = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 600);

    // ONE worker spanning every handler set, not one worker per operation. Handlers carry
    // absolute URLs, so a single worker covers them all — and ADR-0016 § 14 records why the
    // harness stays single-origin even though the upstream flows call three.
    await setupWorker(
      ...makeEvoHandlers({ baseUrl, latencyMs }),
      ...makeAirHandlers({ baseUrl, latencyMs }),
      ...makeItineraryHandlers({ baseUrl, latencyMs }),
      ...makeStateroomHandlers({ baseUrl, latencyMs }),
      ...makeExtensionsHandlers({ baseUrl, latencyMs }),
      // The integration layer's search routes (VCX-10507), so `VITE_CRUISE_PROVIDER=il` runs
      // without a real IL or a real Entra token. Off when the agent wants the local IL behind
      // the `/api` proxy instead.
      ...(import.meta.env.VITE_IL_DEV_MOCKS === 'false'
        ? []
        : makeIntegrationLayerHandlers({ latencyMs })),
    ).start({
      // Anything we haven't modelled — Vite's own HMR traffic, fonts — must pass through.
      onUnhandledRequest: 'bypass',
      quiet: true,
      // BASE_URL-relative so the worker resolves when the app is served from a sub-path,
      // which it will be once it is embedded in Dynamics.
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
  } catch (cause) {
    // Surfaced, not swallowed: without this the symptom is "every search fails" with no clue.
    console.error('[dev-mocks] MSW failed to start; continuing unmocked.', cause);
  }
}
