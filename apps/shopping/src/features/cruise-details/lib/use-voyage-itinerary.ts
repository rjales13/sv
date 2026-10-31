import { useQuery } from '@tanstack/react-query';
import type { VoyageItinerary } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { useVoyageItineraryProvider } from '../../../app/data/providers-context.tsx';

// Fetches one cruise's itinerary through the typed port (ADR-0016 § 5).
//
// The port narrative arrives already joined to each stop, so the tab reads one shape and
// never learns that EVO supplied the ports and AEM supplied the copy.

export interface VoyageItineraryQueryResult {
  itinerary: VoyageItinerary | undefined;
  isPending: boolean;
  /** Set when the call failed, as opposed to succeeding with no itinerary. */
  errorMessage: string | undefined;
}

export function useVoyageItinerary(
  cruiseId: string | undefined,
  principal: AuthenticatedPrincipal,
): VoyageItineraryQueryResult {
  const provider = useVoyageItineraryProvider();

  const query = useQuery({
    queryKey: ['voyage-itinerary', cruiseId, principal.principalId],
    // `enabled` rather than an early return, so a tab rendered before the route resolves
    // reports "pending" instead of firing a call for `undefined`.
    enabled: cruiseId !== undefined,
    queryFn: async (): Promise<VoyageItinerary | { error: string }> => {
      const result = await provider.getItinerary({
        requestId: crypto.randomUUID(),
        cruiseId: cruiseId ?? '',
        principal: {
          principalId: principal.principalId,
          officeCurrency: principal.officeCurrency,
          authorizationScopes: principal.authorizationScopes ?? [],
        },
      });

      // The port's error and empty outcomes are values, not exceptions — callers render
      // states, not catch blocks. An empty result carries '' so it is distinguishable from a
      // real failure without a second field.
      if (result.status === 'error') return { error: result.message };
      if (result.status === 'empty') return { error: '' };
      return result.itinerary;
    },
  });

  const data = query.data;
  const failed = data !== undefined && 'error' in data && data.error !== '';

  return {
    itinerary: data !== undefined && !('error' in data) ? data : undefined,
    isPending: cruiseId !== undefined && query.isPending,
    errorMessage: failed ? (data as { error: string }).error : undefined,
  };
}
