import type { SearchCatalogs } from '@vikings/contracts';

export interface SearchPanelOption {
  value: string;
  label: string;
}

// Option lists for the search panel (VCX-10507).
//
// They come from the CRM's catalogs through the `SearchCatalogsProvider` port — never typed by
// hand. This module only turns those catalogs into what the controls render: the `value` of an
// option is the EXACT string its search filter matches on, the `label` is what the approved
// Figma frame prints. Those are not always the same word, and a prettified value silently
// matches nothing, so change a label freely and a value only against the filter it feeds.

/** The no-narrowing scope sentinel. */
export const SEARCH_SCOPE_ALL = 'All';

/** Every list the panel offers. */
export interface SearchPanelOptions {
  scopes: readonly SearchPanelOption[];
  products: readonly SearchPanelOption[];
  portCities: readonly SearchPanelOption[];
  hotelCities: readonly SearchPanelOption[];
  currencies: readonly SearchPanelOption[];
}

const ALL_SCOPE: SearchPanelOption = { value: SEARCH_SCOPE_ALL, label: 'Scope (All)' };

/**
 * What the panel offers before the catalogs arrive, or when they fail: only the "All" scope,
 * which the form's defaults already select. The panel stays usable — a search with no
 * narrowing — rather than blocking on a list it can live without.
 */
export const EMPTY_SEARCH_PANEL_OPTIONS: SearchPanelOptions = {
  scopes: [ALL_SCOPE],
  products: [],
  portCities: [],
  hotelCities: [],
  currencies: [],
};

const same = (text: string): SearchPanelOption => ({ value: text, label: text });

export function toSearchPanelOptions(catalogs: SearchCatalogs): SearchPanelOptions {
  return {
    scopes: catalogs.scopes.map((scope) => (scope === SEARCH_SCOPE_ALL ? ALL_SCOPE : same(scope))),
    products: catalogs.products.map(({ product }) => same(product)),
    // Port cities are matched by NAME against each sailing's ports of call, and shown by their
    // "City, Country" label where the catalog has one (VCX-10587 R5); hotel cities go to EVO's
    // hotel list as CODES and are shown by name.
    portCities: catalogs.portCities.map(({ name, label }) => ({
      value: name,
      label: label ?? name,
    })),
    hotelCities: catalogs.hotelCities.map(({ code, name }) => ({ value: code, label: name })),
    // Several offices can price in one currency; the picker offers each currency once.
    currencies: [...new Set(catalogs.currencies.map(({ currency }) => currency))].map(same),
  };
}

/**
 * The EVO brands the chosen products select — what the search actually filters on.
 *
 * A product the catalogs do not list (or catalogs not loaded yet) is passed through as is:
 * dropping it would turn "only these products" into "all products", a silently wider search.
 */
export function brandsForProducts(
  products: readonly string[],
  catalogs: SearchCatalogs | undefined,
): string[] {
  return products.flatMap(
    (product) => catalogs?.products.find((p) => p.product === product)?.brands ?? [product],
  );
}

/**
 * The search currency to start from (VCX-10482 R2): the one the agent's CRM office prices in.
 *
 * An office that prices in several currencies keeps the configured one when it is among them —
 * R2's US office sells USD and CAD and starts on USD. Its CAD exception (a Direct guest living
 * in Canada) needs the contact's country, which the integration layer does not send yet. With
 * no office, no catalogs, or an office they do not list, the configured currency stands.
 */
export function defaultSearchCurrency(
  office: string | undefined,
  catalogs: SearchCatalogs | undefined,
  configured: string,
): string {
  if (office === undefined || catalogs === undefined) return configured;
  const allowed = catalogs.currencies
    .filter((row) => row.office === office)
    .map((row) => row.currency);
  if (allowed.includes(configured)) return configured;
  return allowed[0] ?? configured;
}
