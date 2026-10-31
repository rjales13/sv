import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { PrincipalRef, SearchCatalogsResult } from '@vikings/contracts';
import { useSearchCatalogsProvider } from './providers-context.tsx';

/**
 * The search form's choice lists (VCX-10507), read through the injected port.
 *
 * Reference data that does not change while an agent works, so it is fetched once per session
 * (`staleTime: Infinity`): the Search screen unmounts every time the agent opens a cruise, and
 * refetching the lists on each return would only flash empty dropdowns.
 *
 * Like the search, an expected failure is a value (`data.status === 'error'`), not a throw.
 */
export function useSearchCatalogs(principal: PrincipalRef): UseQueryResult<SearchCatalogsResult> {
  const provider = useSearchCatalogsProvider();
  return useQuery({
    queryKey: ['search-catalogs'],
    queryFn: () => provider.getCatalogs({ requestId: crypto.randomUUID(), principal }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
