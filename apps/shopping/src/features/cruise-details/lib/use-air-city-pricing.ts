import { useQuery } from '@tanstack/react-query';
import type { AirCityPricing } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { useAirCityPricingProvider } from '../../../app/data/providers-context.tsx';

// Fetches one cruise's Viking Air offering through the typed port (ADR-0016 § 5).
//
// Unlike `useCruiseById`, this maps onto a REAL EVO operation — `GetCruiseAirCityPricing` —
// so there is no window-widening trick here: the request names the cruise and the response is
// that cruise's fares.
//
// The whole gateway table arrives in one call (567 rows for HID270322T), which is how EVO
// serves it. Pricing a selection afterwards is therefore a local lookup, not a round trip —
// see `viking-air-pricing.ts`. That is why the tab no longer simulates a per-selection delay:
// the only real wait is this fetch.

/**
 * EVO selling office.
 *
 * `US` is what every committed request sample and payload carries, and the principal does not
 * name an office — only a currency. Hardcoding it here rather than deriving it from the
 * currency keeps the guess visible: the two are different things, and a multi-office run will
 * need the office to come from the host context, not from a mapping invented here.
 */
const EVO_OFFICE = 'US';

export interface AirCityPricingResult {
  pricing: AirCityPricing | undefined;
  isPending: boolean;
  /** Set when the call itself failed, as opposed to succeeding with no air offering. */
  errorMessage: string | undefined;
}

export function useAirCityPricing(
  cruiseId: string | undefined,
  principal: AuthenticatedPrincipal,
  currency: string,
): AirCityPricingResult {
  const provider = useAirCityPricingProvider();

  const query = useQuery({
    queryKey: ['air-city-pricing', cruiseId, currency, principal.principalId],
    // `enabled` rather than an early return, so a tab rendered before the route resolves
    // reports "pending" instead of firing a call for `undefined`.
    enabled: cruiseId !== undefined,
    queryFn: async (): Promise<AirCityPricing | { error: string }> => {
      const result = await provider.getAirCityPricing({
        requestId: crypto.randomUUID(),
        cruiseId: cruiseId ?? '',
        office: EVO_OFFICE,
        currency,
        // Empty means "whatever EVO defaults to" — the sentinel the committed request sample
        // sends. A group rate code would come from the search criteria once that is wired.
        rateCode: '',
        principal: {
          principalId: principal.principalId,
          officeCurrency: principal.officeCurrency,
          authorizationScopes: principal.authorizationScopes ?? [],
        },
      });

      // The port's error and empty outcomes are values, not exceptions, so they are mapped
      // here rather than thrown — the hook's callers render states, not catch blocks.
      if (result.status === 'error') return { error: result.message };
      if (result.status === 'empty') return { error: '' };
      return result.pricing;
    },
  });

  const data = query.data;
  const failed = data !== undefined && 'error' in data && data.error !== '';

  return {
    pricing: data !== undefined && !('error' in data) ? data : undefined,
    isPending: cruiseId !== undefined && query.isPending,
    errorMessage: failed ? (data as { error: string }).error : undefined,
  };
}
