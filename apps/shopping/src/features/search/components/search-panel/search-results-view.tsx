import type { CategoryPricingAvailability } from '@vikings/contracts';
import { Alert, AlertDescription, AlertTitle } from '@vikings/ui/components/alert';
import { Button } from '@vikings/ui/components/button';
import { EmptyState } from '@vikings/ui/components/empty-state';
import { Spinner } from '@vikings/ui/components/spinner';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useHostShell } from '@/app/host/host-shell-context.tsx';
import { cruiseTabPath } from '@/app/routing/cruise-tabs.ts';
import { FiltersBar } from '@/features/search/components/filters-bar/index.ts';
import { ResultsCard } from '@/features/search/components/results-card/index.ts';
import {
  applySortAndFilter,
  filterBySoldOut,
  filterByStateroomType,
  type ResultSortKey,
  stateroomFilterOptions,
  toCruiseCardModel,
} from '@/features/search/lib/results-view-model.ts';
import { VAlert } from '@/shared/components/alert/index.ts';
import { resultsViewStore } from '../../lib/results-view-store.ts';

// FR3 (read-only cards + client-side sort/filter) and FR4 (the four search-path
// UI states) rendered distinctly and accessibly. The state is owned by the
// controller; this component is presentational — sort/filter run over the
// already-returned set (no new port call), which is the FR3.2 pass/fail criterion.

/** The four FR4 states plus a pre-search `idle`. */
export type SearchViewState = 'idle' | 'loading' | 'populated' | 'empty' | 'error';

export interface SearchResultsViewProps {
  state: SearchViewState;
  results: readonly CategoryPricingAvailability[];
  /** Number of guests from the search criteria — drives the occupancy label (AC3). */
  guests?: number | undefined;
  /** Accessible error message for the FR4 error state (incl. the NFR5 denied path). */
  errorMessage?: string | undefined;
  /** Re-runs the failed search. Without it the error state is a dead end, because
   *  re-submitting the same criteria resolves to the same cache entry. */
  onRetry?: (() => void) | undefined;
  /** Clears the criteria and returns to the idle state — the empty state's way out (R9). */
  onResetFilters?: (() => void) | undefined;
  /** The search stopped at its 200-sailing limit (VCX-10507 AC 13). */
  limited?: boolean | undefined;
  /** The promo code an empty result is down to (VCX-10484 AC 1). */
  unmatchedPromoCode?: string | undefined;
}

const SORT_OPTIONS: { value: ResultSortKey; label: string }[] = [
  { value: 'departure', label: 'Embarkation Date (Ascending)' },
  { value: 'name', label: 'Cruise Name' },
  { value: 'nights', label: 'Nights' },
];

/** The populated state: FiltersBar + pricing alert + result cards (FR3.1/FR3.2). */
function PopulatedResults({
  results,
  guests,
  limited,
}: {
  results: readonly CategoryPricingAvailability[];
  guests: number;
  limited: boolean;
}) {
  // Read from the results-view store, not local state: this screen unmounts whenever the
  // agent opens a cruise, and coming back must find the list sorted and filtered as it was.
  const {
    sort,
    stateroomType,
    pricingAlertOpen,
    showSoldOutCruises,
    showSoldOutPackages,
    showSoldOutHotels,
    setView,
  } = resultsViewStore(
    useShallow(({ scrollTop: _scrollTop, resetView: _resetView, ...view }) => view),
  );

  // FR3.1 keeps the card read-only; opening the cruise is a NAVIGATION, not selection. It goes
  // through the host shell (ADR-0010): the feature says where, the host adapter decides how.
  const host = useHostShell();
  const openRoute = (path: string) => host.navigate({ kind: 'route', path });

  const filterOptions = useMemo(
    () => stateroomFilterOptions(results).map((name) => ({ value: name, label: name })),
    [results],
  );

  // Sold-out filter → stateroom filter → sort (FR3.2). Sold-out sailings are hidden by
  // default (R5: the toggle opts the agent in, not out).
  const visible = applySortAndFilter(
    filterByStateroomType(filterBySoldOut(results, showSoldOutCruises), stateroomType),
    { sort, query: '' },
  );

  const displayCurrency = results[0]?.categories[0]?.currency ?? 'USD';

  return (
    <div data-testid="results-populated" className="flex flex-col gap-4">
      <FiltersBar
        data-testid="results-filters"
        resultCount={visible.length}
        filterValue={stateroomType}
        filterOptions={filterOptions}
        onFilterChange={(value) => setView({ stateroomType: value })}
        showSoldOutCruises={showSoldOutCruises}
        onShowSoldOutCruisesChange={(value) => setView({ showSoldOutCruises: value })}
        showSoldOutPackages={showSoldOutPackages}
        onShowSoldOutPackagesChange={(value) => setView({ showSoldOutPackages: value })}
        showSoldOutHotels={showSoldOutHotels}
        onShowSoldOutHotelsChange={(value) => setView({ showSoldOutHotels: value })}
        sortValue={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => setView({ sort: v as ResultSortKey })}
      />

      {/* AC 13: past 200 matches the search keeps 200. Not dismissible — while it is on screen
          the list is incomplete, and the agent must not quote it as if it were all there is. */}
      {limited && (
        <div data-testid="results-limited">
          <VAlert
            variant="warning"
            description="More than 200 sailings match, so only the first 200 are shown. Narrow the search to see the rest."
          />
        </div>
      )}

      {/* Pricing context — node 2189:392307: per-person price disclaimer (AC3: must reflect
          active currency and occupancy from search criteria). */}
      {pricingAlertOpen && (
        <div data-testid="results-pricing-alert">
          <VAlert
            variant="info"
            description={
              <>
                Showing price per person for{' '}
                <strong data-testid="results-occupancy">
                  {guests === 1 ? 'SINGLE' : 'DOUBLE'}
                </strong>{' '}
                occupancy in {displayCurrency} ({displayCurrency})
              </>
            }
            onDismiss={() => setView({ pricingAlertOpen: false })}
          />
        </div>
      )}

      <ul
        className="flex flex-col gap-4"
        aria-live="polite"
        aria-label={`${visible.length} results`}
      >
        {visible.map((result) => (
          <li key={result.cruiseId} data-testid="cruise-card">
            <ResultsCard
              {...toCruiseCardModel(result)}
              onCruiseDetails={() => openRoute(cruiseTabPath(result.cruiseId))}
              onPricelineSelect={(abbrev) =>
                openRoute(
                  `${cruiseTabPath(result.cruiseId, 'stateroom')}?cat=${encodeURIComponent(abbrev)}`,
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Loading skeletons with an accessible busy status (FR4). */
function LoadingResults() {
  return (
    <div
      data-testid="results-loading"
      role="status"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-4 py-16"
    >
      <Spinner className="size-11" aria-hidden="true" />
      {/* typography/title/lg (16px semibold) + color/text/disabled per Figma node 2189:392262 */}
      <span className="text-base font-semibold leading-snug text-center text-ink-disabled">
        Loading results
      </span>
    </div>
  );
}

export function SearchResultsView({
  state,
  results,
  guests = 2,
  errorMessage,
  onRetry,
  onResetFilters,
  limited,
  unmatchedPromoCode,
}: SearchResultsViewProps) {
  return (
    <section aria-label="Search results" data-testid="search-results">
      {/* The pre-search placeholder (node 2456:93896), which the frames put on every screen
          before a search runs. It is the EmptyState `Icon-text` variant exactly — 78px badge,
          16px gap, the same 20px/1.3 headline — so it is that component rather than a
          one-off: no description and no CTA, because there is nothing yet to widen or clear. */}
      {state === 'idle' && (
        <EmptyState
          data-testid="results-idle"
          icon="IconContentDirectionsBoat"
          title="Start a new cruise search"
        />
      )}

      {state === 'loading' && <LoadingResults />}

      {state === 'error' && (
        <Alert variant="error" data-testid="results-error">
          <AlertTitle>Search failed</AlertTitle>
          <AlertDescription>
            {errorMessage ?? 'The cruise search could not be completed.'}
          </AlertDescription>
          {onRetry !== undefined && (
            <Button variant="secondary" onClick={onRetry} data-testid="results-retry">
              Retry
            </Button>
          )}
        </Alert>
      )}

      {/* The approved `EmptyState` (node 2456:24623). The frame words it around the CUSTOMER
          — which is the point of a search opened from a contact record — and offers a way out
          rather than leaving the agent at a dead end. */}
      {state === 'empty' && (
        <EmptyState
          data-testid="results-empty"
          icon="IconContentDirectionsBoat"
          // VCX-10484 AC 1: when the promo is why nothing came back, say so. EVO cannot tell an
          // unknown code from one in another currency or one not enabled for GDS, so the copy
          // names all three rather than guess.
          title={
            unmatchedPromoCode === undefined
              ? 'No cruises match your search'
              : `No cruises are available with promo code ${unmatchedPromoCode}`
          }
          description={
            unmatchedPromoCode === undefined
              ? 'Try adjusting the dates, destinations, or filters to see more options for this customer.'
              : 'Sailings match your other filters, but none is priced under this promo. The code may not exist in this currency or may not be enabled for GDS.'
          }
          {...(onResetFilters !== undefined && {
            action: (
              <Button variant="secondary" onClick={onResetFilters} data-testid="results-reset">
                Reset filters
              </Button>
            ),
          })}
        />
      )}

      {state === 'populated' && (
        <PopulatedResults results={results} guests={guests} limited={limited === true} />
      )}
    </section>
  );
}
