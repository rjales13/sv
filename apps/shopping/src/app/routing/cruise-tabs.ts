// The cruise-details tab vocabulary, in one place so the router, the tab strip and the
// store cannot disagree about what a tab is called.
//
// Slugs are singular and lowercase; the approved frames label them "Itinerary / Staterooms /
// Extensions / Viking Air". The label belongs to the UI, the slug belongs to the URL — see
// CONTEXT.md § The shopping workspace.

export const CRUISE_TABS = ['itinerary', 'stateroom', 'extensions', 'air'] as const;

export type CruiseTab = (typeof CRUISE_TABS)[number];

/** The agent lands here when they open a cruise: the frames open on the itinerary. */
export const DEFAULT_CRUISE_TAB: CruiseTab = 'itinerary';

export function isCruiseTab(value: string | undefined): value is CruiseTab {
  return value !== undefined && (CRUISE_TABS as readonly string[]).includes(value);
}

/**
 * Coerces a URL segment to a real tab.
 *
 * Deliberately forgiving: a stale bookmark or a hand-edited URL should land the agent on the
 * cruise rather than on a 404, because the cruise id — the expensive part of the link — is
 * still valid.
 */
export function parseCruiseTab(value: string | undefined): CruiseTab {
  return isCruiseTab(value) ? value : DEFAULT_CRUISE_TAB;
}

/** The canonical deep link for one cruise tab. */
export function cruiseTabPath(cruiseId: string, tab: CruiseTab = DEFAULT_CRUISE_TAB): string {
  return `/cruise/${encodeURIComponent(cruiseId)}/${tab}`;
}
