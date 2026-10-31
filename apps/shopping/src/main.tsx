// The browser entry point. It imports the DS token layer once (so the whole app renders on
// the real Viking theme), then mounts <App/> under React 19's createRoot in StrictMode.
// StrictMode double-invokes effects in dev to surface unsafe patterns early — the composition
// root's async bootstrap is written to tolerate that (its effect is idempotent and cancels on
// cleanup), so it is safe to keep on.
import '@vikings/ui/globals.css';
// After the DS layer, so the app's own shell rules win over its base styles.
import './app-shell.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { shouldStartDevMocks } from './dev/should-start-dev-mocks.ts';

const rootElement = document.getElementById('root');
// Fail loud rather than silently no-op: a missing mount node means index.html and this entry
// have drifted, which is a build/wiring bug we want surfaced immediately, not a blank page.
if (rootElement === null) {
  throw new Error('Root element #root not found — index.html is missing the mount node.');
}

// Created before the await below so the narrowing from the null check above still holds.
const root = createRoot(rootElement);

// In dev, the mock worker must be intercepting BEFORE the first request leaves the app —
// otherwise the opening search races the worker and fails. The import is dynamic and
// dev-guarded so neither msw nor the handler kit reaches a production bundle.
if (shouldStartDevMocks(import.meta.env)) {
  const { startDevMocks } = await import('./dev/start-dev-mocks.ts');
  await startDevMocks(import.meta.env.VITE_EVO_BASE_URL ?? '');
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
