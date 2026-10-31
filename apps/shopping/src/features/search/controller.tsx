import type { AuthenticatedPrincipal } from '@vikings/platform';
import { Alert, AlertDescription } from '@vikings/ui/components/alert';
import { useCallback, useMemo, useRef } from 'react';
import { SearchPanel, type SearchPanelHandle } from '@/features/search/components/search-panel';
import { SearchResultsView } from '@/features/search/components/search-panel/search-results-view';
import { useCruiseSearch } from '../../app/data/use-cruise-search.ts';
import { cruiseWorkspaceStore } from '../../store/cruise-workspace.store.ts';
import { buildCruiseSearchRequest, toPrincipalRef } from './lib/criteria-to-request.ts';
import { resultsViewStore } from './lib/results-view-store.ts';
import { brandsForProducts, defaultSearchCurrency } from './lib/search-panel-options.ts';
import {
  buildDefaultSearchPanelValues,
  type SailingWindow,
  SearchPanelSchema,
  type SearchPanelValues,
} from './lib/search-panel-schema.ts';
import { toSearchView } from './lib/search-view-state.ts';
import { useResultsScroll } from './lib/use-results-scroll.ts';
import { useSearchPanelCatalogs } from './lib/use-search-panel-catalogs.ts';

/**
 * Whether two criteria sets are the same search.
 *
 * Structural rather than referential: the form hands back a fresh object each submit. Key
 * order is stable because both sides come from the same form shape.
 */
function sameCriteria(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// The Search -> Results controller (U6). It depends ONLY on the typed port — reached through
// Query, which reads it from the composition root's context — and on the resolved
// `AuthenticatedPrincipal`, never on a concrete adapter (FR6.2).
//
// Neither the criteria nor the results live in this component's state, and that is the whole
// point (VCX-10323): this screen unmounts whenever the agent opens a cruise, so anything held
// here went with it and every return to Search forced a re-search — which made the
// multi-cruise workspace (VCX-10326) impractical to use. The criteria now live in the
// workspace store and the results in the Query cache, both of which outlive the mount.
//
// NFR5 bridge: the principal seeds the FR1.1 default currency and is projected into every
// request's `PrincipalRef`. A denied outcome — the port returning `error{kind:"denied"}` —
// maps into the accessible error state like any other failure.

export interface CruiseSearchControllerProps {
  /** The authenticated principal — seeds the currency default and the request principal (NFR5). */
  principal: AuthenticatedPrincipal;
  /** Injectable "now" so the default 2-month date window is deterministic under test. */
  now?: Date;
  /**
   * Overrides the `now`-relative default date window. The prototype sets this to the
   * committed fixture's span so the opening search finds inventory; production omits it.
   */
  sailingWindow?: SailingWindow | undefined;
  /** The signed-in agent's CRM office (e.g. "UK"); the search currency defaults from it. */
  agentOffice?: string | undefined;
}

export function CruiseSearchController({
  principal,
  now,
  sailingWindow,
  agentOffice,
}: CruiseSearchControllerProps) {
  // The form's lists come from the CRM catalogs (VCX-10507), not from constants.
  const {
    options,
    catalogs,
    errorMessage: catalogsError,
  } = useSearchPanelCatalogs(toPrincipalRef(principal));

  // VCX-10482 R2: the currency defaults from the agent's CRM office, which the catalogs map to
  // its currencies — so it settles once they load, and the panel takes it if still untouched.
  // The configured office currency stands until then, or without CRM data.
  const defaultCurrency = defaultSearchCurrency(agentOffice, catalogs, principal.officeCurrency);

  // Memoised: `SearchPanel` compares the live values against this object to decide whether
  // SEARCH and RESET are enabled, so a fresh one each render would defeat the comparison.
  const defaultValues = useMemo(
    () => buildDefaultSearchPanelValues(defaultCurrency, now ?? new Date(), sailingWindow),
    [defaultCurrency, now, sailingWindow],
  );

  // The empty state's "Reset filters" has to drive the panel's own reset — see the note on
  // `SearchPanelHandle`. Without it that button cleared the results and left the filters
  // populated, so the next Search reproduced the same empty result.
  const panelRef = useRef<SearchPanelHandle>(null);

  const searchCriteria = cruiseWorkspaceStore((workspace) => workspace.searchCriteria);
  const setSearchCriteria = cruiseWorkspaceStore((workspace) => workspace.setSearchCriteria);

  // Memoized so the Query key is stable across renders: `buildCruiseSearchRequest` mints a
  // fresh `requestId` each call, and an unmemoized request would look like a new query on
  // every render and refetch forever.
  // Parsed, not cast. The store holds criteria loosely (it has no business knowing the form's
  // shape), and `buildCruiseSearchRequest` parses against the CONTRACT schema — which throws.
  // A throw here would happen during render, and there is no ErrorBoundary in this app, so one
  // bad value would blank the whole screen. Falling back to idle is recoverable; a blank page
  // is not.
  const request = useMemo(() => {
    if (searchCriteria === null) return null;
    const values = SearchPanelSchema.safeParse(searchCriteria);
    if (!values.success) return null;
    // The form keeps the PRODUCTS the agent ticked; the search filters on the EVO brands each
    // one selects, which only the catalogs know (VCX-10507).
    const products = brandsForProducts(values.data.products, catalogs);
    return buildCruiseSearchRequest({ ...values.data, products }, principal);
  }, [searchCriteria, principal, catalogs]);

  const query = useCruiseSearch(request);
  const { state, results, errorMessage, limited, unmatchedPromoCode } = toSearchView({
    hasCriteria: searchCriteria !== null,
    isError: query.isError,
    result: query.data,
  });

  // Back from a cruise, the list comes back sorted, filtered and scrolled as the agent left it.
  const resultsScroll = useResultsScroll(state === 'populated');

  // A new result set starts with a fresh view — default sort and filters, top of the list —
  // as it always did when each search remounted the list. Only returning restores the old one.
  const startFreshResultsView = useCallback(() => {
    resultsViewStore.getState().resetView();
    resultsScroll.scrollToTop();
  }, [resultsScroll.scrollToTop]);

  const handleResetFilters = useCallback(() => {
    startFreshResultsView();
    setSearchCriteria(null);
  }, [setSearchCriteria, startFreshResultsView]);

  function handleSubmit(values: SearchPanelValues) {
    // Identical criteria resolve to the same query key, so `setSearchCriteria` alone would be
    // a no-op inside `staleTime` — the agent would press Search and see nothing happen.
    const unchanged = searchCriteria !== null && sameCriteria(values, searchCriteria);
    if (!unchanged) startFreshResultsView();
    setSearchCriteria(values);
    if (unchanged) void query.refetch();
  }

  // The guest context band is NOT rendered here: the frames carry it on every screen, so it
  // belongs to the shell (host-shell/guest-context-band.tsx). Owning it here made it vanish
  // the moment an agent opened a cruise.
  return (
    // Fills the available height so the form is fixed and only the results scroll,
    // matching the cruise-details pattern (overflow-hidden on the shell, own inner scroll).
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Search form — fixed; does not scroll away */}
      <div className="shrink-0 px-4 pt-4 pb-6">
        {catalogsError !== undefined && (
          <Alert variant="warning" data-testid="search-catalogs-error" className="mb-4">
            <AlertDescription>{catalogsError}</AlertDescription>
          </Alert>
        )}
        <SearchPanel
          ref={panelRef}
          // VCX-10588 R1: a new search session opens with every filter in view. A search then
          // collapses it, so the results get the agent's attention.
          defaultExpanded
          defaultValues={defaultValues}
          options={options}
          onSearch={handleSubmit}
          // A reset returns the screen to its pre-search state too — leaving the previous
          // results under a freshly-cleared form would show criteria that no longer produced
          // them.
          onReset={handleResetFilters}
        />
      </div>

      {/* Results section — the single scroll area */}
      <div
        ref={resultsScroll.ref}
        onScroll={resultsScroll.onScroll}
        data-testid="results-scroll"
        className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 pb-6"
      >
        <SearchResultsView
          state={state}
          results={results}
          guests={
            searchCriteria !== null
              ? (SearchPanelSchema.safeParse(searchCriteria).data?.guests ?? 2)
              : 2
          }
          errorMessage={errorMessage}
          limited={limited}
          unmatchedPromoCode={unmatchedPromoCode}
          onRetry={() => void query.refetch()}
          // Goes through the panel so the FIELDS are cleared as well, not just the results.
          onResetFilters={() => panelRef.current?.reset()}
        />
      </div>
    </div>
  );
}
