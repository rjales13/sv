import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// The multi-cruise workspace (ADR-0012): several cruises open at once, each carrying the
// agent's choices across the cruise-details tabs.
//
// Two rules do the heavy lifting here, and both are load-bearing rather than stylistic:
//
//  1. **Choices are persisted; money never is.** Prices are server-owned and move. A price
//     read back from browser storage would render as authoritative and be wrong — on a
//     screen whose whole job is a quote, that is the worst available failure. Totals are
//     derived from live data on every render instead.
//  2. **Closing a tab is destructive.** Without that, a week of demos grows localStorage
//     without bound. The ✕ in the approved frames implies it (pending Catalina's
//     confirmation — see VCX-10326).
//
// Note the approved designs give the Itinerary tab nothing selectable — it is a read-only
// day list plus a map — so there is no `itinerary` slice here despite ADR-0012 listing four.
// Day-accordion expansion is ephemeral view state and deliberately not persisted.

/**
 * Browser storage, or a working no-op when there isn't any.
 *
 * `localStorage` is not always reachable: a private window, blocked site data, or a
 * non-browser runtime (our own node test env) all make it absent or make the accessor
 * itself throw. Persistence is a convenience here, never a correctness requirement — the
 * workspace must render correctly with nothing stored — so we degrade to memory rather
 * than letting a storage failure surface as a broken app.
 */
function createWorkspaceStorage(): Storage {
  try {
    const probe = '__vikings.probe__';
    globalThis.localStorage.setItem(probe, probe);
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      get length() {
        return memory.size;
      },
      clear: () => memory.clear(),
      getItem: (key) => memory.get(key) ?? null,
      key: (index) => [...memory.keys()][index] ?? null,
      removeItem: (key) => {
        memory.delete(key);
      },
      setItem: (key, value) => {
        memory.set(key, value);
      },
    };
  }
}

/** Beyond this, the oldest tab is evicted: the strip stops being legible and storage grows. */
export const MAX_OPEN_CRUISES = 5;

/**
 * The persisted-shape version. Bump when `PersistedWorkspace` changes shape.
 *
 * v2 added `cruiseLabels`. A restored v1 workspace would render nameless tabs, so it is
 * discarded rather than half-restored — see {@link migrateWorkspace}.
 */
export const WORKSPACE_VERSION = 2;

// Browser storage is an integration boundary like any other: the payload is user-editable,
// survives across deploys, and predates any shape change we make. So it is Zod-parsed on the
// way back in, and `z.infer` is the single source of truth for these types — no parallel
// hand-maintained interfaces (AGENTS.md invariant 2, § 5).

export const StateroomChoiceSchema = z.object({
  categoryAbbrev: z.string(),
  cabinNumber: z.string(),
  deck: z.number(),
});

export const GuestAirChoiceSchema = z.object({
  includeAirfare: z.boolean(),
  originGateway: z.string().optional(),
  returnGateway: z.string().optional(),
  /** EVO class code for the outbound leg — 'Q' economy, 'P' premium economy, 'D' business. */
  originClass: z.string().optional(),
  /** EVO class code for the return leg — 'Q' economy, 'P' premium economy, 'D' business. */
  returnClass: z.string().optional(),
});

/** One cruise's choices. Every field is something the AGENT picked, never something priced. */
export const CruiseChoicesSchema = z.object({
  stateroom: StateroomChoiceSchema.optional(),
  extensionIds: z.array(z.string()),
  air: z.record(z.string(), GuestAirChoiceSchema),
  /** Per-guest travel-protection opt-in, keyed by guest id. Eligibility (e.g. the
   *  "PPP Non-eligible guest (Non-US Resident)" rule in the breakdown) is a pricing
   *  concern and is NOT decided here — this records only what the agent ticked. */
  travelProtection: z.record(z.string(), z.boolean()),
});

/**
 * Exactly what survives a reload.
 *
 * Strict, not passthrough — the opposite of the EVO wire schemas (invariant 4). An unknown
 * key here is not a forward-compatible upstream addition; it is our own older shape, or a
 * hand-edited payload. Rejecting it is what makes the reset below trustworthy.
 */
export const PersistedWorkspaceSchema = z.strictObject({
  openCruises: z.array(z.string()),
  byCruise: z.record(z.string(), CruiseChoicesSchema),
  /**
   * What each open tab is labelled — the cruise name, keyed by id.
   *
   * Persisted even though it is server-derived rather than an agent choice, because the tab
   * strip has to render names immediately after a reload, before any request resolves. It is
   * identity, not money: the rule it must not break is "no prices in storage", and a cruise
   * name cannot go stale into a wrong number.
   */
  cruiseLabels: z.record(z.string(), z.string()),
});

export type StateroomChoice = z.infer<typeof StateroomChoiceSchema>;
export type GuestAirChoice = z.infer<typeof GuestAirChoiceSchema>;
export type CruiseChoices = z.infer<typeof CruiseChoicesSchema>;
export type PersistedWorkspace = z.infer<typeof PersistedWorkspaceSchema>;

/**
 * Live workspace state, including what is deliberately NOT written to storage.
 *
 * `searchCriteria` is in the store but out of `partialize`, which is the whole point:
 * CONTEXT.md defines search criteria as "Transient — it has no identity of its own and is
 * never persisted (ADR-007)". Because this store is a module singleton, in-memory state here
 * already survives the Search screen unmounting — which is the actual problem (VCX-10323) —
 * without contradicting that definition. Persisting it would restore an agent's last search
 * across sessions, which sounds helpful and is a different decision needing an ADR.
 *
 * Loosely typed because the form's shape is the search feature's business, not the store's;
 * the feature re-validates with its own schema before use.
 */
export interface WorkspaceData extends PersistedWorkspace {
  searchCriteria: Record<string, unknown> | null;
  /**
   * Runtime-only per-cruise airfare totals.
   *
   * Not persisted — prices are server-owned and must never be written to storage (rule 1).
   * Keyed by cruise id; the tab writes it as selections resolve, the footer reads it.
   */
  airfareTotal: Record<string, number>;
}

export interface WorkspaceActions {
  /** Records the criteria a search was run with. Null clears back to the idle state. */
  setSearchCriteria(criteria: Record<string, unknown> | null): void;
  /** Names an open tab. Called once the cruise resolves; the strip shows the id until then. */
  setCruiseLabel(cruiseId: string, label: string): void;
  openCruise(cruiseId: string): void;
  closeCruise(cruiseId: string): void;
  selectStateroom(cruiseId: string, choice: StateroomChoice): void;
  toggleExtension(cruiseId: string, extensionId: string): void;
  setGuestAir(cruiseId: string, guestId: string, choice: GuestAirChoice): void;
  setTravelProtection(cruiseId: string, guestId: string, included: boolean): void;
  /** Sets the runtime airfare total for one cruise. Never persisted. */
  setAirfareTotal(cruiseId: string, total: number): void;
}

export type WorkspaceState = WorkspaceData & WorkspaceActions;

const EMPTY_CHOICES: CruiseChoices = { extensionIds: [], air: {}, travelProtection: {} };

const EMPTY_WORKSPACE: PersistedWorkspace = { openCruises: [], byCruise: {}, cruiseLabels: {} };

const EMPTY_WORKSPACE_DATA: WorkspaceData = {
  ...EMPTY_WORKSPACE,
  searchCriteria: null,
  airfareTotal: {},
};

/**
 * Narrows the store to the persisted keys — the `partialize` seam, exported so the "no money
 * in storage" rule is directly assertable rather than merely intended.
 *
 * Two deliberate omissions. `activeCruiseId` is absent here AND from the live store: the URL
 * names which cruise and tab are in view (ADR-0012 § 4), and a second copy would disagree
 * with it after a navigation. `searchCriteria` IS in the live store but omitted here, because
 * CONTEXT.md defines search criteria as never persisted (ADR-007).
 */
export function persistedSlice(state: WorkspaceState): PersistedWorkspace {
  return {
    openCruises: state.openCruises,
    byCruise: state.byCruise,
    cruiseLabels: state.cruiseLabels,
  };
}

/**
 * Validates a payload coming back out of storage.
 *
 * This is the Zod boundary parse (invariant 2), and it lives here rather than in `migrate`
 * because **zustand only calls `migrate` when the stored version differs** from the current
 * one. A same-version payload skips it entirely — so validating there would leave the common
 * case (a hand-edited or truncated current-version blob) merged in unchecked. `merge` runs on
 * every rehydrate, which is why it is wired to this.
 *
 * Deliberately all-or-nothing: half-restoring an unrecognised payload leaves the workspace in
 * a state no code path expects, and the symptom then surfaces far from the cause. A cleared
 * workspace is recoverable in one click; a corrupted one is not.
 */
export function parsePersistedWorkspace(persisted: unknown): PersistedWorkspace {
  const parsed = PersistedWorkspaceSchema.safeParse(persisted);
  return parsed.success ? parsed.data : { ...EMPTY_WORKSPACE };
}

/**
 * Handles a version change. Shape validation is {@link parsePersistedWorkspace}'s job and
 * runs afterwards regardless, so this only has to decide whether an older payload is worth
 * carrying forward at all — and none are: v1 predates tab labels.
 */
export function migrateWorkspace(persisted: unknown, version: number): PersistedWorkspace {
  if (version !== WORKSPACE_VERSION) return { ...EMPTY_WORKSPACE };
  return parsePersistedWorkspace(persisted);
}

/** Applies `update` to one cruise's choices, seeding the slice if the tab is new. */
function withChoices(
  state: WorkspaceState,
  cruiseId: string,
  update: (choices: CruiseChoices) => CruiseChoices,
): Pick<WorkspaceState, 'byCruise'> {
  const current = state.byCruise[cruiseId] ?? EMPTY_CHOICES;
  return { byCruise: { ...state.byCruise, [cruiseId]: update(current) } };
}

/** Drops the listed keys from a per-cruise map in one pass. */
function without<T>(map: Record<string, T>, cruiseIds: readonly string[]): Record<string, T> {
  const next = { ...map };
  for (const id of cruiseIds) delete next[id];
  return next;
}

export const cruiseWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...EMPTY_WORKSPACE_DATA,

      openCruise: (cruiseId) =>
        set((state) => {
          // Already open: nothing to add. Which tab is ACTIVE is the URL's business, not
          // this store's — keeping a copy here would give one fact two owners that disagree
          // after a navigation (ADR-0012 § 4).
          if (state.openCruises.includes(cruiseId)) return {};

          const opened = [...state.openCruises, cruiseId];
          const evicted = opened.slice(0, Math.max(0, opened.length - MAX_OPEN_CRUISES));
          return {
            openCruises: opened.slice(-MAX_OPEN_CRUISES),
            // Seed a slice only if this cruise has none. Overwriting would silently discard
            // choices that survived a reload but are absent from `openCruises`.
            byCruise: {
              ...without(state.byCruise, evicted),
              [cruiseId]: state.byCruise[cruiseId] ?? EMPTY_CHOICES,
            },
            cruiseLabels: without(state.cruiseLabels, evicted),
          };
        }),

      closeCruise: (cruiseId) =>
        set((state) => {
          const openCruises = state.openCruises.filter((id) => id !== cruiseId);
          return {
            openCruises,
            byCruise: without(state.byCruise, [cruiseId]),
            cruiseLabels: without(state.cruiseLabels, [cruiseId]),
          };
        }),

      setSearchCriteria: (criteria) => set({ searchCriteria: criteria }),

      setCruiseLabel: (cruiseId, label) =>
        set((state) => ({ cruiseLabels: { ...state.cruiseLabels, [cruiseId]: label } })),

      selectStateroom: (cruiseId, choice) =>
        set((state) => withChoices(state, cruiseId, (c) => ({ ...c, stateroom: choice }))),

      toggleExtension: (cruiseId, extensionId) =>
        set((state) =>
          withChoices(state, cruiseId, (c) => ({
            ...c,
            extensionIds: c.extensionIds.includes(extensionId)
              ? c.extensionIds.filter((id) => id !== extensionId)
              : [...c.extensionIds, extensionId],
          })),
        ),

      setTravelProtection: (cruiseId, guestId, included) =>
        set((state) =>
          withChoices(state, cruiseId, (c) => ({
            ...c,
            travelProtection: { ...c.travelProtection, [guestId]: included },
          })),
        ),

      setGuestAir: (cruiseId, guestId, choice) =>
        set((state) =>
          withChoices(state, cruiseId, (c) => ({ ...c, air: { ...c.air, [guestId]: choice } })),
        ),

      setAirfareTotal: (cruiseId, total) =>
        set((state) => ({ airfareTotal: { ...state.airfareTotal, [cruiseId]: total } })),
    }),
    {
      name: 'vikings.cruise-workspace',
      version: WORKSPACE_VERSION,
      storage: createJSONStorage(createWorkspaceStorage),
      partialize: persistedSlice,
      migrate: migrateWorkspace,
      // Always runs on rehydrate, unlike `migrate` — so this is where the boundary parse has
      // to be for it to mean anything.
      merge: (persisted, current) => ({ ...current, ...parsePersistedWorkspace(persisted) }),
    },
  ),
);
