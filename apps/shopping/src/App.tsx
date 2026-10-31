import { BrowserRouter } from 'react-router';
import { AppCompositionRoot } from './app/app-composition-root.tsx';
import {
  EMBED_BASENAME,
  type HostShellMode,
  MockDynamicsShell,
  resolveHostShellMode,
} from './host-shell/index.ts';

// The entry component, and the one place the embedding split lives.
//
// Two documents, one bundle, in the default `mock` mode:
//   - `/`        the MOCK Dynamics shell, which frames the app in an <iframe>
//   - `/embed/*` the app itself, which is what that iframe loads
//
// In `direct` mode (VITE_HOST_SHELL=direct, for an environment real D365 frames) there is no
// mock shell: the root is the app, because CRM points its iframe at `/?contactId=…`. `/embed`
// still serves the app too, so a link already pointing there keeps working.
//
// The app mounts under a router `basename`, so every route inside it is still written and
// tested as `/cruise/:cruiseId/:tab` — react-router adds the prefix. That is why adding the
// shell changed no route, no path helper and no existing test.
//
// The trade, stated plainly: in mock mode the browser address bar shows the SHELL, so a link
// deep into a cruise resolves at `/embed/cruise/.../…` and renders without the host chrome.
// Making the shell mirror the inner route would need a postMessage sync layer — worth it if the
// demo needs shareable deep links, not worth it before then.

function isEmbedded(): boolean {
  return globalThis.location?.pathname.startsWith(EMBED_BASENAME) ?? false;
}

export interface AppProps {
  /** Overrides `VITE_HOST_SHELL`, so a test can render either mode without touching env. */
  mode?: HostShellMode;
}

export function App({ mode = resolveHostShellMode(import.meta.env.VITE_HOST_SHELL) }: AppProps) {
  const embedded = isEmbedded();
  if (mode === 'mock' && !embedded) return <MockDynamicsShell />;

  return (
    // h-screen, not min-h-screen: the document can no longer scroll (see app-shell.css), so a
    // wrapper allowed to grow past the viewport would put content somewhere nothing can reach.
    // `min-h-0` lets the main shrink to its parent rather than being floored at its content
    // height by flexbox's default `min-height: auto`.
    <div className="flex h-screen flex-col bg-page text-ink">
      <main className="flex min-h-0 flex-1 flex-col">
        {/* The router wraps the composition root so a deep link is resolved AFTER auth:
            no route can render before the denied gate has run. */}
        <BrowserRouter basename={embedded ? EMBED_BASENAME : '/'}>
          <AppCompositionRoot />
        </BrowserRouter>
      </main>
    </div>
  );
}
