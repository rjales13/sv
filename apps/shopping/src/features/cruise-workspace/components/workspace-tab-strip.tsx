import { SessionTab } from '@vikings/ui/components/session-tab';
import { useMatch, useNavigate } from 'react-router';
import { cruiseTabPath } from '../../../app/routing/cruise-tabs.ts';
import { cruiseWorkspaceStore } from '../../../store/cruise-workspace.store.ts';

// VCX-10326 — the app's own tab strip.
//
// ⚠️ Not to be confused with the Dynamics record tab strip sitting directly above it: that
// one is 44px and belongs to the host (VCX-10325); this one is 39px and is ours. They are
// near-homonyms in the design file (`tabs-bar` vs `Tabs Bar`), which is exactly why this
// comment exists.
//
// The strip is app chrome, present on every screen, so it renders above the routed content
// rather than inside any one route. `Search` is pinned: it is where the agent starts and the
// place they return to, so it is never closable.
//
// Closing a tab is destructive — it discards that cruise's choices (ADR-0012). The ✕ in the
// approved frames implies it, but nothing in the corpus states it outright; VCX-10326 carries
// the open question for Catalina.

/**
 * The tab that takes focus when `closedIndex` is removed.
 *
 * Adjacent, the way browser tabs behave: the neighbour to the right, or the left one when
 * the closed tab was last. Jumping to the end of the strip instead would move the agent
 * somewhere they weren't looking.
 */
function focusAfterClose(remaining: readonly string[], closedIndex: number): string | undefined {
  return remaining[closedIndex] ?? remaining.at(-1);
}

export function WorkspaceTabStrip() {
  const navigate = useNavigate();
  const openCruises = cruiseWorkspaceStore((state) => state.openCruises);
  const cruiseLabels = cruiseWorkspaceStore((state) => state.cruiseLabels);
  const closeCruise = cruiseWorkspaceStore((state) => state.closeCruise);

  // The URL owns which cruise is in view (ADR-0012), so the active tab is read from the route
  // rather than from store state that could disagree with it.
  const match = useMatch('/cruise/:cruiseId/*');
  const routedCruiseId = match?.params.cruiseId;

  function handleClose(cruiseId: string): void {
    const closedIndex = openCruises.indexOf(cruiseId);
    closeCruise(cruiseId);

    // Only the active tab's removal strands the agent; a background tab closing must not
    // yank them off the screen they are working on.
    if (cruiseId !== routedCruiseId) return;

    // Read the post-close list from the store rather than recomputing the filter here, so
    // there is one implementation of "what is left" instead of two that can diverge.
    const remaining = cruiseWorkspaceStore.getState().openCruises;
    const next = focusAfterClose(remaining, closedIndex);
    navigate(next === undefined ? '/' : cruiseTabPath(next));
  }

  return (
    <nav aria-label="Open cruises" data-testid="workspace-tab-strip">
      {/* Geometry from the approved `tabs-bar` frame (node 2456:23846): the strip sits on the
          page surface with an 8px lead-in above the tabs, 16px in from the left and 24px from
          the right, closed by a 1px border/default hairline.
          `border-line` replaces a `border-subtle` that never resolved — Tailwind exposes
          `--color-line-subtle`, not `--color-subtle`, so that class was inert and the hairline
          was only landing on the right colour via the default border fallback. */}
      <ul className="flex items-end gap-1 border-b border-line bg-page pt-2 pr-6 pl-4">
        <li>
          {/* SessionTab's wrapper carries role="group" but no name of its own, which leaves
              an unnamed group in the a11y tree — label it with the tab it represents. */}
          <SessionTab
            aria-label="Search"
            state={routedCruiseId === undefined ? 'active' : 'inactive'}
            leadingIcon="IconTravelTravelExplore16"
            closable={false}
            onSelect={() => navigate('/')}
          >
            Search
          </SessionTab>
        </li>
        {openCruises.map((cruiseId) => (
          <li key={cruiseId}>
            <SessionTab
              aria-label={cruiseLabels[cruiseId] ?? cruiseId}
              state={cruiseId === routedCruiseId ? 'active' : 'inactive'}
              closeLabel={`Close ${cruiseLabels[cruiseId] ?? cruiseId}`}
              onSelect={() => navigate(cruiseTabPath(cruiseId))}
              onClose={() => handleClose(cruiseId)}
            >
              {/* The id stands in until the cruise resolves and names the tab. */}
              {cruiseLabels[cruiseId] ?? cruiseId}
            </SessionTab>
          </li>
        ))}
      </ul>
    </nav>
  );
}
