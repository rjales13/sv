import type {
  AirCityPricingProvider,
  CruiseExtensionsProvider,
  CruiseSearchProvider,
  SearchCatalogsProvider,
  StateroomAvailabilityProvider,
  VoyageItineraryProvider,
} from '@vikings/contracts';
import { createContext, use } from 'react';

// Carries the typed ports from the composition root down to the hooks that need them.
//
// This is what lets data fetching live in components WITHOUT breaking the adapter-boundary
// rule (AGENTS.md invariant 1): components read a port from context and call its methods, so
// they still depend on `@vikings/contracts` alone. The one place a concrete adapter is chosen
// remains `select-provider.ts` (ADR-006).
//
// ONE context holding a bundle, not one context per port (ADR-0016 § 3). Five nested
// providers in the composition root would say nothing extra, and a bundle keeps "what this
// app is wired to" answerable by reading a single type.

export interface AppProviders {
  cruiseSearch: CruiseSearchProvider;
  airCityPricing: AirCityPricingProvider;
  voyageItinerary: VoyageItineraryProvider;
  stateroomAvailability: StateroomAvailabilityProvider;
  cruiseExtensions: CruiseExtensionsProvider;
  /** The search form's choice lists (VCX-10507). */
  searchCatalogs: SearchCatalogsProvider;
}

/**
 * The injected ports.
 *
 * `Partial` because a test mounts only the ports its subject actually calls — requiring all
 * five would make every component test construct adapters it never exercises. The per-port
 * hooks below turn a missing one into a named error at the point of use.
 */
export const ProvidersContext = createContext<Partial<AppProviders> | null>(null);

function usePort<K extends keyof AppProviders>(key: K): AppProviders[K] {
  const providers = use(ProvidersContext);
  const port = providers?.[key];
  if (port === undefined || port === null) {
    // Throws rather than returning null: a missing port is a wiring bug in the composition
    // root, and failing here names it. The alternative is an optional-chained call that
    // silently never fetches and looks exactly like an empty result.
    throw new Error(
      `No ${key} provider in scope. Mount this tree inside <ProvidersContext>, which the app ` +
        'composition root supplies.',
    );
  }
  return port;
}

export function useCruiseSearchProvider(): CruiseSearchProvider {
  return usePort('cruiseSearch');
}

export function useAirCityPricingProvider(): AirCityPricingProvider {
  return usePort('airCityPricing');
}

export function useVoyageItineraryProvider(): VoyageItineraryProvider {
  return usePort('voyageItinerary');
}

export function useStateroomAvailabilityProvider(): StateroomAvailabilityProvider {
  return usePort('stateroomAvailability');
}

export function useCruiseExtensionsProvider(): CruiseExtensionsProvider {
  return usePort('cruiseExtensions');
}

export function useSearchCatalogsProvider(): SearchCatalogsProvider {
  return usePort('searchCatalogs');
}
