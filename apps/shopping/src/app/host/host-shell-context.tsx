import type { HostShell } from '@vikings/platform';
import { createContext, use, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';

// Carries the host seam from the composition root to the features that ask it to navigate
// (ADR-0010, VCX-10480). A feature says where it wants to go — `host.navigate({ kind: 'route',
// path })` — and never calls the router or the window itself, so a different host (a PCF
// control, a Web Resource) changes the adapter, not the feature.

export const HostShellContext = createContext<HostShell | null>(null);

export function useHostShell(): HostShell {
  const host = use(HostShellContext);
  if (host === null) {
    // A wiring bug: the composition root always supplies the host. Failing names it, where a
    // missing host would otherwise look like a button that does nothing.
    throw new Error('No host shell in scope. Mount this tree inside <HostShellContext>.');
  }
  return host;
}

/**
 * A stable `(path) => void` that always calls the router's latest `navigate`.
 *
 * A host adapter is created once, outside render, so it cannot call `useNavigate` itself. This
 * hands it a function whose identity never changes while still reaching the router that is
 * mounted now.
 */
export function useRouterNavigateTo(): (path: string) => void {
  const navigate = useNavigate();
  const latest = useRef(navigate);
  latest.current = navigate;
  return useCallback((path: string) => {
    void latest.current(path);
  }, []);
}
