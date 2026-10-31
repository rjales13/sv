import { useQuery } from '@tanstack/react-query';
import type { CruiseExtensions } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { useCruiseExtensionsProvider } from '../../../app/data/providers-context.tsx';

// Fetches one cruise's extension offering through the typed port (ADR-0016 § 5).
//
// The Extensions tab and the Build Panel both call this; React Query serves them from one
// cache entry, which is what stops the card list and the footer total disagreeing about what
// an extension costs.

const EVO_OFFICE = 'US';

export interface CruiseExtensionsQueryResult {
  offering: CruiseExtensions | undefined;
  isPending: boolean;
  errorMessage: string | undefined;
}

export function useCruiseExtensions(
  cruiseId: string | undefined,
  principal: AuthenticatedPrincipal,
  currency: string,
): CruiseExtensionsQueryResult {
  const provider = useCruiseExtensionsProvider();

  const query = useQuery({
    queryKey: ['cruise-extensions', cruiseId, currency, principal.principalId],
    enabled: cruiseId !== undefined,
    queryFn: async (): Promise<CruiseExtensions | { error: string }> => {
      const result = await provider.getExtensions({
        requestId: crypto.randomUUID(),
        cruiseId: cruiseId ?? '',
        office: EVO_OFFICE,
        currency,
        principal: {
          principalId: principal.principalId,
          officeCurrency: principal.officeCurrency,
          authorizationScopes: principal.authorizationScopes ?? [],
        },
      });

      if (result.status === 'error') return { error: result.message };
      if (result.status === 'empty') return { error: '' };
      return result.offering;
    },
  });

  const data = query.data;
  const failed = data !== undefined && 'error' in data && data.error !== '';

  return {
    offering: data !== undefined && !('error' in data) ? data : undefined,
    isPending: cruiseId !== undefined && query.isPending,
    errorMessage: failed ? (data as { error: string }).error : undefined,
  };
}
