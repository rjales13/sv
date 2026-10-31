import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { CategoryPricingAvailability } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { useCruiseSearchProvider } from '../../../app/data/providers-context.tsx';
import { cruiseWorkspaceStore } from '../../../store/cruise-workspace.store.ts';
import { type SailingWindow, SearchPanelSchema } from '../../search/index.ts';

// Resolves ONE cruise for the details container.
//
// There is deliberately no `getCruiseById` port method, because EVO has no cruise-detail
// endpoint: the corpus composes the detail tabs from getVoyageItinerary + AEM content +
// stateroom availability + extensions + air pricing, and CatAvail is what supplies the
// pricing/availability this header needs. So we ask CatAvail for a wide window and pick the
// sailing out of it.
//
// Cost, stated honestly: this does NOT reuse the results screen's cache — that query is
// keyed by the agent's criteria, this one by a fixed window, so opening the first cruise
// after a search costs one extra call. The key is constant across cruises, so every
// subsequent cruise (and every tab switch within one) is served from cache. That trade is
// acceptable against 20 fixture rows and would not be against live inventory — when the real
// detail endpoints land, this hook is the single place that changes.

/** A window wide enough to contain any sailing the prototype can deep-link to. */
const DEEP_LINK_WINDOW: SailingWindow = { from: '2020-01-01', to: '2039-12-31' };

export interface CruiseByIdResult {
  cruise: CategoryPricingAvailability | undefined;
  isPending: boolean;
  /** Set when the search itself failed, as opposed to succeeding and matching nothing. */
  errorMessage: string | undefined;
}

export function useCruiseById(
  cruiseId: string | undefined,
  principal: AuthenticatedPrincipal,
  window: SailingWindow = DEEP_LINK_WINDOW,
): CruiseByIdResult {
  const provider = useCruiseSearchProvider();
  // Mirror the last search criteria so stateroom prices match the search results screen.
  // Falls back to the principal's office currency and 2 guests when no search has run yet.
  const rawCriteria = cruiseWorkspaceStore((s) => s.searchCriteria);
  const parsed = rawCriteria !== null ? SearchPanelSchema.safeParse(rawCriteria).data : undefined;
  const guests = parsed?.guests ?? 2;
  const currency = parsed?.currency ?? principal.officeCurrency;
  const promoCodes = parsed?.promoCodes ?? [];

  const query: UseQueryResult<CategoryPricingAvailability[] | { error: string }> = useQuery({
    queryKey: ['cruise-by-id', window, principal.principalId, guests, currency, promoCodes],
    queryFn: async () => {
      const result = await provider.search({
        requestId: crypto.randomUUID(),
        searchMode: 'open',
        products: [],
        scope: 'All',
        naturalLanguageQuery: '',
        sailingDateFrom: window.from,
        sailingDateTo: window.to,
        // 0 is "no upper bound" — see the nights predicate in @vikings/adapters.
        nightsFrom: 0,
        nightsTo: 0,
        guests,
        portCities: [],
        hotelCities: [],
        currency,
        promoCodes,
        groupContractNumber: '',
        principal: {
          principalId: principal.principalId,
          officeCurrency: principal.officeCurrency,
          authorizationScopes: principal.authorizationScopes ?? [],
        },
      });
      if (result.status === 'ok') return result.results;
      if (result.status === 'empty') return [];
      // An expected failure (incl. the NFR5 denied path) is a value, not a throw — it carries
      // a message the container renders rather than a generic error state.
      return { error: result.message };
    },
    enabled: cruiseId !== undefined,
  });

  const data = query.data;
  if (data !== undefined && !Array.isArray(data)) {
    return { cruise: undefined, isPending: false, errorMessage: data.error };
  }

  return {
    cruise: data?.find((row) => row.cruiseId === cruiseId),
    isPending: query.isPending && query.fetchStatus !== 'idle',
    errorMessage: query.isError ? 'The cruise could not be loaded.' : undefined,
  };
}
