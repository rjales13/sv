import { useEffect } from 'react';
import { useParams } from 'react-router';
import { cruiseWorkspaceStore } from '../../store/cruise-workspace.store.ts';
import { type CruiseTab, parseCruiseTab } from './cruise-tabs.ts';

/**
 * Joins the URL to the workspace store (ADR-0012).
 *
 * The division of labour: the **URL** owns which cruise and tab are in view, so a deep link,
 * a reload and the browser back button all work without extra machinery. The **store** owns
 * the choices made inside a cruise. Keeping "what am I looking at" out of the store is what
 * stops the two disagreeing after a navigation.
 *
 * Arriving on a deep link opens the cruise as a tab, so a pasted link produces the same
 * workspace as clicking through to it.
 */
export function useCruiseRoute(): { cruiseId: string | undefined; tab: CruiseTab } {
  const params = useParams<{ cruiseId: string; tab: string }>();
  // react-router already percent-decodes params; named for clarity at the call site.
  const cruiseId = params.cruiseId;
  const tab = parseCruiseTab(params.tab);

  useEffect(() => {
    if (cruiseId === undefined) return;
    // `openCruise` re-activates an already-open cruise rather than resetting it, so this is
    // safe to run on every navigation — it never discards choices.
    cruiseWorkspaceStore.getState().openCruise(cruiseId);
  }, [cruiseId]);

  return { cruiseId, tab };
}
