import { useQuery } from '@tanstack/react-query';
import type { StateroomAvailability } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { useStateroomAvailabilityProvider } from '../../../app/data/providers-context.tsx';

// Fetches one (cruise, category) pair's cabins through the typed port (ADR-0016 § 5).
//
// Queried per CATEGORY because EVO's endpoint is per-category — and because its response
// cannot say which category it answered for (ADR-0015 § 2), so the pair has to be in the
// query key or the cache would serve one category's cabins under another's name.

const EVO_OFFICE = 'US';

export interface StateroomAvailabilityQueryResult {
  availability: StateroomAvailability | undefined;
  isPending: boolean;
  errorMessage: string | undefined;
}

export function useStateroomAvailability(
  cruiseId: string | undefined,
  categoryCode: string | null,
  principal: AuthenticatedPrincipal,
  currency: string,
  occupancy: number,
): StateroomAvailabilityQueryResult {
  const provider = useStateroomAvailabilityProvider();
  const enabled = cruiseId !== undefined && categoryCode !== null;

  const query = useQuery({
    queryKey: ['stateroom-availability', cruiseId, categoryCode, currency, occupancy],
    // No category selected means no query — the tab shows the category picker first.
    enabled,
    queryFn: async (): Promise<StateroomAvailability | { error: string }> => {
      const result = await provider.getAvailability({
        requestId: crypto.randomUUID(),
        cruiseId: cruiseId ?? '',
        categoryCode: categoryCode ?? '',
        office: EVO_OFFICE,
        currency,
        occupancy,
        principal: {
          principalId: principal.principalId,
          officeCurrency: principal.officeCurrency,
          authorizationScopes: principal.authorizationScopes ?? [],
        },
      });

      if (result.status === 'error') return { error: result.message };
      // `empty` means the cruise is not walkable at all. A category with nothing available is
      // `guarantee`, which is an OK outcome, not an absence.
      if (result.status === 'empty') return { error: '' };
      return result.availability;
    },
  });

  const data = query.data;
  const failed = data !== undefined && 'error' in data && data.error !== '';

  return {
    availability: data !== undefined && !('error' in data) ? data : undefined,
    isPending: enabled && query.isPending,
    errorMessage: failed ? (data as { error: string }).error : undefined,
  };
}
