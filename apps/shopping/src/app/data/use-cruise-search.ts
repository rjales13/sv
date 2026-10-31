import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { CruiseSearchRequest, CruiseSearchResult } from '@vikings/contracts';
import { useCruiseSearchProvider } from './providers-context.tsx';

/** Drops the trace id so it cannot participate in cache identity. */
function withoutRequestId(request: CruiseSearchRequest): Omit<CruiseSearchRequest, 'requestId'> {
  const { requestId: _traceOnly, ...criteria } = request;
  return criteria;
}

/**
 * Runs a cruise search through the injected port.
 *
 * Pass `null` to stay idle — the search screen has no criteria before the agent submits,
 * and firing an empty search on first paint would both mislead and cost a round trip.
 *
 * The result is the port's discriminated union, delivered as `data`. Expected failures
 * (`error{kind}`, including the NFR5 denied path) are values, not exceptions: they carry a
 * message the FR4 error state renders, and they will never succeed on retry. Only an
 * *unexpected* throw becomes Query's `isError`.
 */
export function useCruiseSearch(
  request: CruiseSearchRequest | null,
): UseQueryResult<CruiseSearchResult> {
  const provider = useCruiseSearchProvider();

  // `requestId` is a per-call trace value, not a search criterion: including it would make
  // every remount (and every re-render that rebuilds the request) look like a brand-new query
  // and refetch, which is precisely what kept results from surviving navigation.
  const criteria = request === null ? null : withoutRequestId(request);

  return useQuery({
    // The CRITERIA are the cache key: two identical searches share a result, and changing any
    // criterion is a different query rather than a mutation of this one.
    queryKey: ['cruise-search', criteria],
    queryFn: () => {
      // Unreachable while `enabled` is false; narrows the type for the call below.
      if (request === null) throw new Error('useCruiseSearch: no request');
      return provider.search(request);
    },
    enabled: request !== null,
  });
}
