import type {
  SearchCatalogs,
  SearchCatalogsProvider,
  SearchCatalogsResult,
} from '@vikings/contracts';
import { type SearchPanelOptions, toSearchPanelOptions } from '../lib/search-panel-options.ts';

// Search-form catalogs for feature tests and stories (VCX-10507). Hand-built on purpose: the
// search feature never imports a concrete adapter, not even in tests (FR6.2 — Biome enforces
// it), so the port is stubbed here the way `search-fixtures.mock.ts` stubs the search port.
//
// The values match the mock catalogs where a test depends on them (the River product, the
// office currency), so a test reads the same against this fixture and the running app.

export const TEST_SEARCH_CATALOGS: SearchCatalogs = {
  scopes: ['All', 'Country', 'Cruise ID', 'Hotels', 'Itinerary Name', 'Ports', 'Ship'],
  products: ['River', 'Ocean', 'Expedition', 'Mississippi'].map((brand) => ({
    product: brand,
    brands: [brand],
  })),
  portCities: ['Amsterdam', 'Basel', 'Luxor'].map((name) => ({ code: name, name })),
  hotelCities: ['Cairo', 'Paris', 'Zurich'].map((name) => ({ code: name, name })),
  currencies: [
    { office: 'UK', currency: 'GBP' },
    { office: 'US', currency: 'USD' },
    { office: 'CA', currency: 'CAD' },
    { office: 'AU', currency: 'AUD' },
  ],
  promos: [
    { code: 'VIKING10', description: '10% off' },
    { code: 'RIVER15', description: '15% off' },
  ],
};

/** The panel's option lists for the fixture — mapped exactly as the controller maps them. */
export const MOCK_SEARCH_PANEL_OPTIONS: SearchPanelOptions =
  toSearchPanelOptions(TEST_SEARCH_CATALOGS);

/** A catalogs port that answers with `result` — the fixture catalogs unless told otherwise. */
export function stubCatalogsProvider(
  result: SearchCatalogsResult = { status: 'ok', catalogs: TEST_SEARCH_CATALOGS },
): SearchCatalogsProvider {
  return { getCatalogs: () => Promise.resolve(result) };
}
