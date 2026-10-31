import type {
  CategoryPricing,
  CategoryPricingAvailability,
  CruiseSearchProvider,
  CruiseSearchRequest,
  CruiseSearchResult,
} from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';

// Shared, hand-written test fixtures and stubs. Named `*.mock.ts` so the root
// Vitest coverage config excludes it from the measured surface. These keep U6
// free of any `@vikings/adapters` import (FR6.2): the controller is exercised
// against an in-process STUB `CruiseSearchProvider`, never the real mock adapter
// (that wiring is U7's composition root + the Playwright E2E).

function category(overrides: Partial<CategoryPricing>): CategoryPricing {
  return {
    categoryClass: '01',
    abbrev: 'ES',
    description: 'Explorer Suite',
    currency: 'USD',
    doublePrice: 5000,
    singlePrice: 7000,
    status: 'OPEN',
    openCabinsAvailable: 4,
    gtyCabinsAvailable: 0,
    ...overrides,
  };
}

// Individually named so tests reference a non-optional fixture directly (no array
// index + non-null assertion under noUncheckedIndexedAccess). Starting price =
// lowest category double: Rhine 3000 < Pharaohs 8000 < Grand European 12000.
export const RHINE_GETAWAY: CategoryPricingAvailability = {
  cruiseId: 'RHN270401',
  cruiseName: 'Rhine Getaway',
  brand: 'River',
  shipName: 'Viking Var',
  itinerary: { fromPort: 'Basel', toPort: 'Amsterdam', fromPortCode: 'BSL', toPortCode: 'AMS' },
  sailingDateFrom: '2027-04-01',
  sailingDateTo: '2027-04-08',
  nights: 7,
  availabilityStatus: 'Available',
  availableToSell: 55,
  categories: [
    category({ abbrev: 'ES', doublePrice: 5000, singlePrice: 7000, openCabinsAvailable: 4 }),
    category({
      abbrev: 'DV',
      description: 'Deluxe Veranda',
      doublePrice: 3000,
      singlePrice: 4200,
      openCabinsAvailable: 2,
    }),
  ],
};

export const PHARAOHS_PYRAMIDS: CategoryPricingAvailability = {
  cruiseId: 'SBK270101',
  cruiseName: 'Pharaohs & Pyramids',
  brand: 'River',
  shipName: 'Viking Sobek',
  itinerary: { fromPort: 'Luxor', toPort: 'Luxor', fromPortCode: 'LXR', toPortCode: 'LXR' },
  sailingDateFrom: '2027-01-01',
  sailingDateTo: '2027-01-08',
  nights: 7,
  availabilityStatus: 'Available',
  availableToSell: 4,
  categories: [
    category({ abbrev: 'A', description: 'Standard', doublePrice: 8000, openCabinsAvailable: 10 }),
  ],
};

export const GRAND_EUROPEAN: CategoryPricingAvailability = {
  cruiseId: 'GRE270601',
  cruiseName: 'Grand European',
  brand: 'Ocean',
  shipName: 'Viking Sky',
  itinerary: { fromPort: 'Budapest', toPort: 'Amsterdam', fromPortCode: 'BUD', toPortCode: 'AMS' },
  sailingDateFrom: '2027-06-01',
  sailingDateTo: '2027-06-15',
  nights: 14,
  availabilityStatus: 'Sold Out',
  availableToSell: 0,
  categories: [
    category({
      abbrev: 'PS',
      description: 'Penthouse Suite',
      doublePrice: 12000,
      openCabinsAvailable: 0,
    }),
  ],
};

/** Three canned cruises with distinct names, prices, dates and nights for sort/filter tests. */
export const CANNED_RESULTS: CategoryPricingAvailability[] = [
  RHINE_GETAWAY,
  PHARAOHS_PYRAMIDS,
  GRAND_EUROPEAN,
];

/** A stub principal — the NFR5 "authenticated" seam used by the controller/view tests. */
export const STUB_PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'stub-agent',
  displayName: 'Stub Agent',
  officeCurrency: 'USD',
  securityRoles: ['cruise-agent'],
  authorizationScopes: ['cruise.search'],
};

/** A stub provider that resolves a fixed canned result — the FR4 state seam. */
export function stubProvider(result: CruiseSearchResult): CruiseSearchProvider {
  return {
    search: (_request: CruiseSearchRequest): Promise<CruiseSearchResult> => Promise.resolve(result),
  };
}

/** A stub provider whose search never resolves — drives the in-flight loading state. */
export function pendingProvider(): CruiseSearchProvider {
  return {
    search: (_request: CruiseSearchRequest): Promise<CruiseSearchResult> => new Promise(() => {}),
  };
}
