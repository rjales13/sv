import { create } from 'zustand';
import type { ResultSortKey } from './results-view-model.ts';

// How the agent left the results list: its sort, its filters, the dismissible pricing alert,
// and how far down it was scrolled.
//
// The Search screen unmounts whenever the agent opens a cruise (VCX-10323), so this cannot be
// component state — it would reset on every return and the agent would land at the top of a
// list in a different order. The results themselves already survive in the Query cache; this
// is the other half that makes "back to Search" mean back to the same place.
//
// A module singleton held in memory only, like the workspace store's `searchCriteria`: it
// outlives the screen, not the session. Persisting it would restore a list position across
// reloads, which is a different decision. Kept in the search feature rather than the
// workspace store because how a result list is sorted is this feature's business.

export interface ResultsView {
  sort: ResultSortKey;
  stateroomType: string;
  showSoldOutCruises: boolean;
  showSoldOutPackages: boolean;
  showSoldOutHotels: boolean;
  /** Part of the view because dismissing it moves every card up by its height. */
  pricingAlertOpen: boolean;
  /** The results scroll area's `scrollTop`, in px. */
  scrollTop: number;
}

interface ResultsViewActions {
  setView(patch: Partial<ResultsView>): void;
  /** Back to the defaults — a new result set gets a fresh view, as it did before (one mount per search). */
  resetView(): void;
}

export const DEFAULT_RESULTS_VIEW: ResultsView = {
  sort: 'departure',
  stateroomType: '',
  // Sold-out sailings are hidden by default: the toggle opts the agent in (R5).
  showSoldOutCruises: false,
  showSoldOutPackages: false,
  showSoldOutHotels: false,
  pricingAlertOpen: true,
  scrollTop: 0,
};

export const resultsViewStore = create<ResultsView & ResultsViewActions>()((set) => ({
  ...DEFAULT_RESULTS_VIEW,
  setView: (patch) => set(patch),
  resetView: () => set(DEFAULT_RESULTS_VIEW),
}));
