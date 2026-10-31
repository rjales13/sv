import { beforeEach, describe, expect, it } from 'vitest';
import {
  cruiseWorkspaceStore,
  MAX_OPEN_CRUISES,
  migrateWorkspace,
  parsePersistedWorkspace,
  persistedSlice,
  WORKSPACE_VERSION,
  type WorkspaceState,
} from './cruise-workspace.store.ts';

// ADR-0012. Two rules carry the risk here and both are asserted below:
//   1. Prices and totals are NEVER persisted — a stale price read back from storage is a
//      wrong number rendered with full confidence, which on a pricing screen is the worst
//      available failure.
//   2. Closing a cruise tab is destructive, so storage cannot grow without bound across a
//      demo week.

const INITIAL: WorkspaceState = cruiseWorkspaceStore.getState();

/** The cleared workspace every rejected payload falls back to. */
const EMPTY = { openCruises: [], byCruise: {}, cruiseLabels: {} };

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL, true);
});

describe('open and close', () => {
  it('opens a cruise as a tab', () => {
    cruiseWorkspaceStore.getState().openCruise('HRJ270426T');

    expect(cruiseWorkspaceStore.getState().openCruises).toEqual(['HRJ270426T']);
  });

  it('holds no notion of an active cruise — that is the URL\u2019s job', () => {
    // A second owner for one fact disagrees the moment a navigation happens (ADR-0012 § 4).
    cruiseWorkspaceStore.getState().openCruise('HRJ270426T');

    expect(cruiseWorkspaceStore.getState()).not.toHaveProperty('activeCruiseId');
  });

  it('does not duplicate a tab for an already-open cruise, or reorder the strip', () => {
    const { openCruise } = cruiseWorkspaceStore.getState();
    openCruise('A');
    openCruise('B');
    openCruise('A');

    expect(cruiseWorkspaceStore.getState().openCruises).toEqual(['A', 'B']);
  });

  it(`evicts the oldest tab beyond ${MAX_OPEN_CRUISES}`, () => {
    const { openCruise } = cruiseWorkspaceStore.getState();
    for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) openCruise(id);

    const { openCruises, byCruise } = cruiseWorkspaceStore.getState();
    expect(openCruises).toEqual(['B', 'C', 'D', 'E', 'F']);
    // The evicted tab's choices go with it — otherwise storage grows forever.
    expect(byCruise).not.toHaveProperty('A');
  });

  it('discards a closed cruise and its choices', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.selectStateroom('A', { categoryAbbrev: 'DV2', cabinNumber: '6047', deck: 6 });
    state.closeCruise('A');

    expect(cruiseWorkspaceStore.getState().openCruises).toEqual([]);
    expect(cruiseWorkspaceStore.getState().byCruise).not.toHaveProperty('A');
  });

  it('preserves strip order when a middle tab closes', () => {
    const { openCruise, closeCruise } = cruiseWorkspaceStore.getState();
    for (const id of ['A', 'B', 'C']) openCruise(id);
    closeCruise('B');

    expect(cruiseWorkspaceStore.getState().openCruises).toEqual(['A', 'C']);
  });
});

describe('per-cruise choices', () => {
  it('does not discard choices when a cruise is reopened', () => {
    // Restored-from-storage choices can exist for a cruise that is not currently in
    // `openCruises`. Seeding an empty slice on open would wipe them silently.
    cruiseWorkspaceStore.setState({
      openCruises: [],
      byCruise: { A: { extensionIds: ['VEN-4N'], air: {}, travelProtection: {} } },
    });

    cruiseWorkspaceStore.getState().openCruise('A');

    expect(cruiseWorkspaceStore.getState().byCruise.A?.extensionIds).toEqual(['VEN-4N']);
  });

  it('records a per-guest travel-protection opt-in', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.setTravelProtection('A', 'guest-1', true);

    expect(cruiseWorkspaceStore.getState().byCruise.A?.travelProtection['guest-1']).toBe(true);
  });

  it('keeps each cruise’s choices independent', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.openCruise('B');
    state.selectStateroom('A', { categoryAbbrev: 'DV2', cabinNumber: '6047', deck: 6 });
    state.selectStateroom('B', { categoryAbbrev: 'PV1', cabinNumber: '7001', deck: 7 });

    const { byCruise } = cruiseWorkspaceStore.getState();
    expect(byCruise.A?.stateroom?.cabinNumber).toBe('6047');
    expect(byCruise.B?.stateroom?.cabinNumber).toBe('7001');
  });

  it('toggles an extension on and back off', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.toggleExtension('A', 'VEN-4N');
    expect(cruiseWorkspaceStore.getState().byCruise.A?.extensionIds).toEqual(['VEN-4N']);

    cruiseWorkspaceStore.getState().toggleExtension('A', 'VEN-4N');
    expect(cruiseWorkspaceStore.getState().byCruise.A?.extensionIds).toEqual([]);
  });

  it('records air choices per guest', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.setGuestAir('A', 'guest-1', {
      includeAirfare: true,
      originGateway: 'AUS',
      originClass: 'D',
      returnClass: 'Q',
    });

    expect(cruiseWorkspaceStore.getState().byCruise.A?.air['guest-1']).toMatchObject({
      includeAirfare: true,
      originGateway: 'AUS',
      originClass: 'D',
      returnClass: 'Q',
    });
  });
});

describe('tab labels', () => {
  it('records the label a tab is shown under', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.setCruiseLabel('A', 'Paris to the Swiss Alps');

    expect(cruiseWorkspaceStore.getState().cruiseLabels.A).toBe('Paris to the Swiss Alps');
  });

  it('persists labels, because the strip must render names after a reload with no network', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.setCruiseLabel('A', 'Paris to the Swiss Alps');

    const slice = persistedSlice(cruiseWorkspaceStore.getState());
    expect(slice.cruiseLabels).toEqual({ A: 'Paris to the Swiss Alps' });
  });

  it('drops the label when the tab closes', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.setCruiseLabel('A', 'Paris to the Swiss Alps');
    state.closeCruise('A');

    expect(cruiseWorkspaceStore.getState().cruiseLabels).not.toHaveProperty('A');
  });

  it('drops the label of an evicted tab', () => {
    const { openCruise, setCruiseLabel } = cruiseWorkspaceStore.getState();
    openCruise('A');
    setCruiseLabel('A', 'Oldest');
    for (const id of ['B', 'C', 'D', 'E', 'F']) openCruise(id);

    expect(cruiseWorkspaceStore.getState().cruiseLabels).not.toHaveProperty('A');
  });
});

describe('persistence', () => {
  it('persists only the agent’s choices, never money', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.selectStateroom('A', { categoryAbbrev: 'DV2', cabinNumber: '6047', deck: 6 });

    const serialized = JSON.stringify(persistedSlice(cruiseWorkspaceStore.getState()));

    expect(serialized).toContain('6047');
    // No price, subtotal, total or currency may survive a reload — they are derived from
    // live data on every render (ADR-0012).
    expect(serialized).not.toMatch(/price|total|subtotal|currency|amount/i);
  });

  it('drops actions from the persisted payload', () => {
    const slice = persistedSlice(cruiseWorkspaceStore.getState());
    expect(slice).not.toHaveProperty('openCruise');
    expect(Object.keys(slice).sort()).toEqual(['byCruise', 'cruiseLabels', 'openCruises']);
  });

  it('leaves the active cruise to the URL rather than storing it', () => {
    // Two owners for one fact disagree the moment a reload lands on a different route than
    // the one last stored (ADR-0012 § 4).
    cruiseWorkspaceStore.getState().openCruise('A');
    expect(persistedSlice(cruiseWorkspaceStore.getState())).not.toHaveProperty('activeCruiseId');
  });

  it('discards an unrecognised persisted shape rather than half-restoring it', () => {
    // A shape from an earlier version of this increment. Restoring it partially would put
    // the workspace in a state no code path expects; starting clean is recoverable.
    expect(migrateWorkspace({ cruises: ['A'] }, 0)).toEqual(EMPTY);
  });

  it('discards a v1 payload, which predates tab labels', () => {
    // v1 had no `cruiseLabels`, so a restored v1 workspace would render nameless tabs.
    expect(migrateWorkspace({ openCruises: ['A'], byCruise: {} }, 1)).toEqual(EMPTY);
  });

  it('never writes the search criteria to storage', () => {
    // CONTEXT.md: "Search criteria: Transient — it has no identity of its own and is never
    // persisted (ADR-007)." They live in the store so they outlive the Search screen
    // unmounting, which is an in-memory concern; persisting them would restore an agent's
    // last search across sessions — a different decision, needing an ADR.
    cruiseWorkspaceStore.getState().setSearchCriteria({ scope: 'Europe', guests: 2 });

    const slice = persistedSlice(cruiseWorkspaceStore.getState());
    expect(slice).not.toHaveProperty('searchCriteria');
    expect(JSON.stringify(slice)).not.toContain('Europe');
  });

  it('still holds the criteria in memory, so navigation does not lose them', () => {
    cruiseWorkspaceStore.getState().setSearchCriteria({ scope: 'Europe' });

    expect(cruiseWorkspaceStore.getState().searchCriteria).toEqual({ scope: 'Europe' });
  });

  it('rejects a same-version payload whose shape does not parse', () => {
    // Browser storage is user-editable, so the version number alone proves nothing. This runs
    // through `parsePersistedWorkspace` because zustand skips `migrate` entirely when the
    // stored version matches — validating only there would never fire in production.
    expect(
      parsePersistedWorkspace({ openCruises: 'not-an-array', byCruise: {}, cruiseLabels: {} }),
    ).toEqual(EMPTY);
  });

  it('rejects a truncated payload — the case migrate alone would have waved through', () => {
    expect(parsePersistedWorkspace({ openCruises: ['A'] })).toEqual(EMPTY);
  });

  it('rejects unknown keys rather than carrying an older shape forward', () => {
    expect(
      parsePersistedWorkspace({ openCruises: [], byCruise: {}, cruiseLabels: {}, legacyField: 1 }),
    ).toEqual(EMPTY);
  });

  it('passes a current-version payload through untouched', () => {
    const persisted = { openCruises: ['A'], byCruise: {}, cruiseLabels: { A: 'Rhine Getaway' } };
    expect(migrateWorkspace(persisted, WORKSPACE_VERSION)).toEqual(persisted);
  });
});

describe('storage availability', () => {
  it('works when browser storage is unreachable', () => {
    // This suite runs in node, where `localStorage` does not exist — so simply reaching
    // this point without the persist middleware erroring is the assertion. A private
    // window or blocked site data takes the same path.
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('A');
    state.toggleExtension('A', 'VEN-4N');

    expect(cruiseWorkspaceStore.getState().byCruise.A?.extensionIds).toEqual(['VEN-4N']);
  });
});
