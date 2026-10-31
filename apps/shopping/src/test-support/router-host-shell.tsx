import { createHostShell } from '@vikings/platform';
import type * as React from 'react';
import { useState } from 'react';
import { HostShellContext, useRouterNavigateTo } from '../app/host/host-shell-context.tsx';

/**
 * Test-only: a mock host whose `navigate` drives the surrounding test router, for tests that
 * render a feature without the composition root. Mount it inside the test's `MemoryRouter`.
 */
export function RouterHostShell({ children }: { children: React.ReactNode }) {
  const navigateTo = useRouterNavigateTo();
  const [host] = useState(() => createHostShell({ navigate: navigateTo }));
  return <HostShellContext value={host}>{children}</HostShellContext>;
}
