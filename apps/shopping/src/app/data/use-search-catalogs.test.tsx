// @vitest-environment happy-dom

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MOCK_SEARCH_CATALOGS, makeMockSearchCatalogsAdapter } from '@vikings/adapters';
import type { SearchCatalogsProvider } from '@vikings/contracts';
import { sampleCruiseSearchRequest } from '@vikings/contracts/conformance';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '../../test-setup.ts';
import { ProvidersContext } from './providers-context.tsx';
import { createAppQueryClient } from './query-client.ts';
import { useSearchCatalogs } from './use-search-catalogs.ts';

// The search form's lists (VCX-10507), read through the injected port like every other query.

const PRINCIPAL = sampleCruiseSearchRequest.principal;

function wrapperFor(provider: SearchCatalogsProvider) {
  const client = createAppQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ProvidersContext value={{ searchCatalogs: provider }}>{children}</ProvidersContext>
    </QueryClientProvider>
  );
}

describe('useSearchCatalogs', () => {
  it('resolves the lists through the injected port', async () => {
    const { result } = renderHook(() => useSearchCatalogs(PRINCIPAL), {
      wrapper: wrapperFor(makeMockSearchCatalogsAdapter({ delayMs: 0 })),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: 'ok', catalogs: MOCK_SEARCH_CATALOGS });
  });

  it('delivers a failure as a value, so the form can still offer what it has', async () => {
    const { result } = renderHook(() => useSearchCatalogs(PRINCIPAL), {
      wrapper: wrapperFor(
        makeMockSearchCatalogsAdapter({ delayMs: 0, simulateError: { kind: 'upstream' } }),
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ status: 'error', kind: 'upstream' });
  });

  // Reference data: reopening the Search screen must not refetch it on every visit.
  it('loads the lists once for the session, however often the form mounts', async () => {
    const provider = makeMockSearchCatalogsAdapter({ delayMs: 0 });
    const getCatalogs = vi.spyOn(provider, 'getCatalogs');
    const wrapper = wrapperFor(provider);

    const first = renderHook(() => useSearchCatalogs(PRINCIPAL), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    const second = renderHook(() => useSearchCatalogs(PRINCIPAL), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(getCatalogs).toHaveBeenCalledTimes(1);
  });
});
