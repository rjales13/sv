import type { CategoryPricingAvailability, CruiseSearchResult } from '@vikings/contracts';
import type { SearchViewState } from '../components/search-panel/search-results-view.tsx';

// The FR4 state machine, as a pure function.
//
// It used to live in the controller as four `useState` calls driven by an async submit
// handler. Query owns the async part now, so all that is left is a mapping from "what Query
// knows" to "which of the five states to render" — and a pure mapping is worth far more in
// tests than the setState choreography it replaces.

export interface SearchQueryFacts {
  /** False before the agent has submitted anything. */
  hasCriteria: boolean;
  /** Query itself rejected — an UNEXPECTED failure, since the port models expected ones. */
  isError: boolean;
  /** The cached result, if any. Present even while a refetch of it is in flight. */
  result: CruiseSearchResult | undefined;
}

export interface SearchView {
  state: SearchViewState;
  results: readonly CategoryPricingAvailability[];
  errorMessage: string | undefined;
  /** The search stopped at its 200-sailing limit; the agent should narrow it (AC 13). */
  limited: boolean;
  /** The promo code an empty result is down to, so the screen can say why (VCX-10484 AC 1). */
  unmatchedPromoCode?: string;
}

const NO_RESULTS: readonly CategoryPricingAvailability[] = [];

/** Shown when Query rejects; expected failures carry their own message from the port. */
const UNEXPECTED_FAILURE = 'The cruise search service is unavailable.';

export function toSearchView(facts: SearchQueryFacts): SearchView {
  if (!facts.hasCriteria)
    return { state: 'idle', results: NO_RESULTS, errorMessage: undefined, limited: false };

  // Surfaced ahead of any cached set: `retry` is off and the port models expected failures as
  // results, so reaching here means something genuinely unexpected broke, and showing stale
  // rows over it would hide that.
  if (facts.isError) {
    return {
      state: 'error',
      results: NO_RESULTS,
      errorMessage: UNEXPECTED_FAILURE,
      limited: false,
    };
  }

  const { result } = facts;

  // A cached result wins over an in-flight refetch of itself — deliberately NOT keyed off
  // `isFetching`. An agent who opens a cruise, reads it for longer than `staleTime` and comes
  // back triggers a background refetch; blanking to the loading state there reproduces the
  // exact defect this exists to fix, just on a delay. This is the `isPending` vs `isFetching`
  // distinction: no data at all is loading, refetching data we already have is not.
  //
  // A genuinely NEW search changes the query key, so there is no cached result for it and the
  // loading state below is reached as FR4 requires.
  if (result === undefined) {
    return { state: 'loading', results: NO_RESULTS, errorMessage: undefined, limited: false };
  }

  if (result.status === 'error') {
    // Includes the NFR5 denied path; the port's message is what the agent needs to read.
    return { state: 'error', results: NO_RESULTS, errorMessage: result.message, limited: false };
  }

  if (result.status === 'empty') {
    return {
      state: 'empty',
      results: NO_RESULTS,
      errorMessage: undefined,
      limited: false,
      ...(result.unmatchedPromoCode !== undefined && {
        unmatchedPromoCode: result.unmatchedPromoCode,
      }),
    };
  }

  return {
    state: result.results.length > 0 ? 'populated' : 'empty',
    results: result.results,
    errorMessage: undefined,
    limited: result.limited === true,
  };
}
