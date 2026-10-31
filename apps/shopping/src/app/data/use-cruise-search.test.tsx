// @vitest-environment happy-dom

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { makeMockCruiseSearchAdapter } from '@vikings/adapters';
import type { CruiseSearchProvider } from '@vikings/contracts';
import { sampleCruiseSearchRequest } from '@vikings/contracts/conformance';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '../../test-setup.ts';
import { ProvidersContext } from './providers-context.tsx';
import { createAppQueryClient } from './query-client.ts';
import { useCruiseSearch } from './use-cruise-search.ts';

// The Query layer sits ABOVE the typed port: hooks call `provider.search()`, never `fetch`.
// That is what keeps the adapter-boundary rule (AGENTS.md invariant 1) intact once data
// fetching moves into components.

// The shared conformance request targets a 2026 window; the committed fixture is
// `catavail-2027`, so a populated search needs a window that actually covers it.
const REQUEST_MATCHING_FIXTURES = {
  ...sampleCruiseSearchRequest,
  sailingDateFrom: '2027-01-01',
  sailingDateTo: '2027-12-31',
};

function wrapperFor(provider: CruiseSearchProvider) {
  const client = createAppQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ProvidersContext value={{ cruiseSearch: provider }}>{children}</ProvidersContext>
    </QueryClientProvider>
  );
}

describe('useCruiseSearch', () => {
  it('resolves a populated search through the injected port', async () => {
    const { result } = renderHook(() => useCruiseSearch(REQUEST_MATCHING_FIXTURES), {
      wrapper: wrapperFor(makeMockCruiseSearchAdapter({ delayMs: 0 })),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.status).toBe('ok');
  });

  it('stays idle until a request exists, so no search fires on first paint', () => {
    const provider = { search: vi.fn() };
    const { result } = renderHook(() => useCruiseSearch(null), {
      wrapper: wrapperFor(provider),
    });

    expect(provider.search).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces a denied outcome as data, not as a thrown error', async () => {
    // The port models expected failures as RESULTS. Treating denied as a Query error would
    // hide the message the FR4 error state has to render, and would trigger retry logic on
    // an outcome that will never succeed.
    const denied: CruiseSearchProvider = {
      search: () =>
        Promise.resolve({ status: 'error', kind: 'denied', message: 'Not authorized' } as const),
    };

    const { result } = renderHook(() => useCruiseSearch(sampleCruiseSearchRequest), {
      wrapper: wrapperFor(denied),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toMatchObject({ status: 'error', kind: 'denied' });
  });

  it('does not retry an unexpected throw', async () => {
    // retry:false is load-bearing: a retried failure sits behind a spinner for seconds
    // before the agent is told anything went wrong.
    const search = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useCruiseSearch(sampleCruiseSearchRequest), {
      wrapper: wrapperFor({ search }),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(search).toHaveBeenCalledTimes(1);
  });
});
