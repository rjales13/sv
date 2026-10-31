import type { SearchCatalogs } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import {
  brandsForProducts,
  defaultSearchCurrency,
  EMPTY_SEARCH_PANEL_OPTIONS,
  SEARCH_SCOPE_ALL,
  toSearchPanelOptions,
} from './search-panel-options.ts';

// The search panel's option lists are the CRM's catalogs (VCX-10507), turned into what the
// controls render. The `value` of each option is what the search filters on; the `label` is
// what the approved Figma frame prints — not always the same word.

const CATALOGS: SearchCatalogs = {
  scopes: ['All', 'Country', 'Ship'],
  products: [
    { product: 'River', brands: ['River'] },
    { product: 'Ocean', brands: ['Ocean', 'Expedition'] },
  ],
  portCities: [
    { code: 'LXR', name: 'Luxor', label: 'Luxor, Egypt' },
    { code: 'PIR', name: 'Athens (Piraeus)' },
  ],
  hotelCities: [{ code: 'CAI', name: 'Cairo' }],
  currencies: [
    { office: 'US', currency: 'USD' },
    { office: 'UK', currency: 'GBP' },
    { office: 'CA', currency: 'USD' },
  ],
  promos: [{ code: 'DN26' }, { code: 'VIKING10', description: '10% off' }],
};

describe('toSearchPanelOptions', () => {
  const options = toSearchPanelOptions(CATALOGS);

  it('labels the "All" scope as the frame does, and keeps the others as they are', () => {
    expect(options.scopes).toEqual([
      { value: SEARCH_SCOPE_ALL, label: 'Scope (All)' },
      { value: 'Country', label: 'Country' },
      { value: 'Ship', label: 'Ship' },
    ]);
  });

  it('offers each product by name', () => {
    expect(options.products).toEqual([
      { value: 'River', label: 'River' },
      { value: 'Ocean', label: 'Ocean' },
    ]);
  });

  // The integration layer matches port cities by NAME against each sailing's ports of call,
  // and takes hotel cities as CODES for EVO's hotel list — so each field keys on what its
  // filter needs.
  // VCX-10587 R5: a port city reads "City, Country" when the catalog labels it, and still
  // filters on the bare name, which is what the sailings' ports of call carry.
  it('keys port cities on the name, shown by their label, and hotel cities on the code', () => {
    expect(options.portCities).toEqual([
      { value: 'Luxor', label: 'Luxor, Egypt' },
      { value: 'Athens (Piraeus)', label: 'Athens (Piraeus)' },
    ]);
    expect(options.hotelCities).toEqual([{ value: 'CAI', label: 'Cairo' }]);
  });

  it('offers each currency once, however many offices price in it', () => {
    expect(options.currencies).toEqual([
      { value: 'USD', label: 'USD' },
      { value: 'GBP', label: 'GBP' },
    ]);
  });
});

describe('brandsForProducts', () => {
  it('expands each chosen product into the EVO brands it selects', () => {
    expect(brandsForProducts(['Ocean'], CATALOGS)).toEqual(['Ocean', 'Expedition']);
  });

  it('keeps "no products" as no products, which means all of them', () => {
    expect(brandsForProducts([], CATALOGS)).toEqual([]);
  });

  it('passes through a product the catalogs do not list, rather than dropping the filter', () => {
    expect(brandsForProducts(['Mississippi'], CATALOGS)).toEqual(['Mississippi']);
  });

  it('passes products through unchanged while the catalogs have not loaded', () => {
    expect(brandsForProducts(['River'], undefined)).toEqual(['River']);
  });
});

describe('EMPTY_SEARCH_PANEL_OPTIONS', () => {
  it('offers the "All" scope even with no catalogs, so the form stays usable', () => {
    expect(EMPTY_SEARCH_PANEL_OPTIONS.scopes).toEqual([
      { value: SEARCH_SCOPE_ALL, label: 'Scope (All)' },
    ]);
    expect(EMPTY_SEARCH_PANEL_OPTIONS.products).toEqual([]);
  });
});

// VCX-10482 R2 / AC 1: the search currency defaults from the agent's CRM office. The catalogs
// list which currencies each office prices in; the IL sends only the signed-in agent's office.
describe('defaultSearchCurrency', () => {
  const offices = (...rows: [string, string][]) => ({
    ...CATALOGS,
    currencies: rows.map(([office, currency]) => ({ office, currency })),
  });

  it("takes the office's currency when it prices in one", () => {
    expect(defaultSearchCurrency('UK', offices(['UK', 'GBP'], ['US', 'USD']), 'USD')).toBe('GBP');
  });

  // R2: a US office sells USD and CAD. CAD is the default only for a Direct guest in Canada,
  // and the IL does not send the contact's country yet, so the configured currency stands.
  it('keeps the configured currency when the office allows it among several', () => {
    expect(defaultSearchCurrency('US', offices(['US', 'USD'], ['US', 'CAD']), 'USD')).toBe('USD');
  });

  it("takes the office's first currency when the configured one is not among them", () => {
    expect(defaultSearchCurrency('AU', offices(['AU', 'AUD'], ['AU', 'NZD']), 'USD')).toBe('AUD');
  });

  it.each([
    ['no CRM office', undefined, offices(['UK', 'GBP'])],
    ['catalogs not loaded', 'UK', undefined],
    ['an office the catalogs do not list', 'DE', offices(['UK', 'GBP'])],
  ])('falls back to the configured currency with %s', (_, office, catalogs) => {
    expect(defaultSearchCurrency(office, catalogs, 'USD')).toBe('USD');
  });
});
