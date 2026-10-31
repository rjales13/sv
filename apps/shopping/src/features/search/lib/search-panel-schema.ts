import { addMonths, format } from 'date-fns';
import { z } from 'zod';
import { SEARCH_SCOPE_ALL } from './search-panel-options.ts';

// The Zod schema for the search panel's inputs (VCX-10323 R1). Zod is the single source of
// truth for the value type (NFR1): `SearchPanelValues` is a `z.infer`, so there is no
// hand-maintained parallel interface. react-hook-form validates through `zodResolver`, and
// the request built from these values is parsed again by U3's `CruiseSearchRequestSchema`.
//
// No `.default()` on any field — defaults live in EMPTY_SEARCH_PANEL_VALUES so the inferred
// type stays fully required and zodResolver stays happy.

/** ISO `yyyy-MM-dd`, so dates compare lexically and need no Date round-trip downstream. */
const ISO_DATE = 'yyyy-MM-dd';

/** R1: the default sailing window is two months wide. */
export const DEFAULT_WINDOW_MONTHS = 2;

/** R1: "Must support one and two guests" — the stepper is bounded, not open-ended. */
export const MIN_GUESTS = 1;

/** The fewest characters a promo code can have: EVO has no promotion list to suggest from. */
export const PROMO_CODE_MIN_LENGTH = 3;
export const PROMO_CODE_MIN_MESSAGE = `A promo code needs at least ${PROMO_CODE_MIN_LENGTH} characters.`;
export const MAX_GUESTS = 2;

/** VCX-10586 R12: shown when To (Nights) is below From (Nights), on blur and on submit. */
export const NIGHTS_RANGE_MESSAGE = 'Max nights must be greater than or equal to min nights.';

export const SearchPanelSchema = z
  .object({
    scope: z.string(),
    naturalLanguageQuery: z.string(),
    // Empty array = "All products" — matches the `[] = all` filter semantics of the adapter.
    products: z.array(z.string()),
    sailingDateFrom: z.string(),
    sailingDateTo: z.string(),
    nightsFrom: z.number().int().min(0),
    nightsTo: z.number().int().min(0),
    guests: z
      .number()
      .int()
      .min(MIN_GUESTS, `Guests must be at least ${MIN_GUESTS}.`)
      .max(MAX_GUESTS, `This prototype supports up to ${MAX_GUESTS} guests.`),
    portCities: z.array(z.string()),
    hotelCities: z.array(z.string()),
    currency: z.string(),
    // Free text, so a code shorter than the minimum is refused here instead of being sent to
    // match nothing. Empty is no promo.
    promoCodes: z
      .array(z.string())
      .refine(
        (codes) =>
          codes.every((code) => code.trim() === '' || code.trim().length >= PROMO_CODE_MIN_LENGTH),
        { message: PROMO_CODE_MIN_MESSAGE },
      ),
    // Agent-mode only: decides which sub-form renders.
    searchMode: z.enum(['open', 'group']),
    // AC2: 7 characters, must begin with "C" (empty = not in group mode).
    groupContractNumber: z.string(),
  })
  .refine(
    (v) =>
      v.searchMode !== 'group' ||
      v.groupContractNumber === '' ||
      /^C[A-Z0-9]{6}$/i.test(v.groupContractNumber),
    {
      message: 'Group contract number must be 7 characters and begin with "C".',
      path: ['groupContractNumber'],
    },
  )
  // Empty is legal on either end and means "unbounded" — `row-filter.ts` reads `''` that way
  // too, so an agent who clears one date gets a half-open window rather than a blocked form.
  .refine((v) => !v.sailingDateFrom || !v.sailingDateTo || v.sailingDateFrom <= v.sailingDateTo, {
    message: 'The "To" date must be on or after the "From" date.',
    path: ['sailingDateTo'],
  })
  // A max of 0 means "no upper bound" (see the nights predicate in @vikings/adapters), so
  // "7 nights or more" is a legal search and must not trip this check.
  .refine((v) => v.nightsTo === 0 || v.nightsFrom <= v.nightsTo, {
    message: NIGHTS_RANGE_MESSAGE,
    path: ['nightsTo'],
  });

export type SearchPanelValues = z.infer<typeof SearchPanelSchema>;

/** An explicit sailing-date window, overriding the `now`-relative default. */
export interface SailingWindow {
  from: string;
  to: string;
}

/** `Date` -> ISO `yyyy-MM-dd`, read with LOCAL getters so the picked day is never shifted. */
export function toIsoDate(date: Date): string {
  return format(date, ISO_DATE);
}

/**
 * The value set with every filter at rest.
 *
 * `currency` is a placeholder here: R1 requires the real default to come from the agent's
 * office, which only the controller knows. Use `buildDefaultSearchPanelValues` rather than
 * this constant wherever a principal is in hand.
 */
export const EMPTY_SEARCH_PANEL_VALUES: SearchPanelValues = {
  scope: SEARCH_SCOPE_ALL,
  naturalLanguageQuery: '',
  products: [],
  sailingDateFrom: '',
  sailingDateTo: '',
  nightsFrom: 0,
  nightsTo: 0,
  guests: 2,
  portCities: [],
  hotelCities: [],
  currency: 'USD',
  promoCodes: [],
  searchMode: 'open',
  groupContractNumber: '',
};

/**
 * Builds the R1 default values.
 *
 * `officeCurrency` comes from the authenticated principal — R1: "Currency must default from
 * the selected office". `now` is injectable so the two-month window is deterministic in tests.
 *
 * `window` overrides that window outright. The prototype needs it because the committed
 * catavail fixture sails in 2027 while a `now`-relative window tracks the wall clock — so the
 * opening search would find nothing today, and would find nothing for a different reason next
 * year. Production leaves it unset and keeps the "today, plus two months" behaviour R1 asks
 * for.
 */
export function buildDefaultSearchPanelValues(
  officeCurrency: string,
  now: Date = new Date(),
  window?: SailingWindow | undefined,
): SearchPanelValues {
  return {
    ...EMPTY_SEARCH_PANEL_VALUES,
    currency: officeCurrency,
    sailingDateFrom: window?.from ?? toIsoDate(now),
    sailingDateTo: window?.to ?? toIsoDate(addMonths(now, DEFAULT_WINDOW_MONTHS)),
  };
}

/**
 * The `To` date after `From` moves (R1: "When the From date changes, the system must push the
 * To date out by two months while leaving it editable").
 *
 * Pure so the rule is testable without a form. It always returns a new `To`, because the
 * requirement is a push, not a clamp — the agent is free to edit it afterwards.
 */
export function pushToDate(fromIso: string): string {
  if (!fromIso) return '';
  return toIsoDate(addMonths(new Date(`${fromIso}T00:00:00`), DEFAULT_WINDOW_MONTHS));
}

/**
 * Fields that are not filters for the SEARCH/RESET gate (VCX-10588). Scope only says where the
 * term is matched, so with no term it narrows nothing; the search mode is a sub-form switch, and
 * the group contract number it reveals is a filter of its own.
 */
const NOT_FILTERS: ReadonlySet<keyof SearchPanelValues> = new Set([
  'scope',
  'naturalLanguageQuery',
  'searchMode',
]);

/**
 * Whether the panel holds something to search on — the one rule that enables both SEARCH and
 * RESET (VCX-10588 R8, R9, R12): the search bar holds text, or a filter has moved off its default.
 *
 * Compared against the CURRENT defaults rather than the empty constant, so the prepopulated dates
 * and office currency do not read as input the moment the panel mounts (R9). The same rule holds
 * collapsed and expanded: collapsing hides the filters but keeps them applied (R5), so a search
 * they define stays possible; and while collapsed only the search bar can change anyway (R8).
 */
export function hasSearchInput(values: SearchPanelValues, defaults: SearchPanelValues): boolean {
  if (values.naturalLanguageQuery.trim() !== '') return true;
  return (Object.keys(defaults) as (keyof SearchPanelValues)[]).some((key) => {
    if (NOT_FILTERS.has(key)) return false;
    const a = values[key];
    const b = defaults[key];
    return Array.isArray(a) && Array.isArray(b)
      ? a.length !== b.length || a.some((v, i) => v !== b[i])
      : a !== b;
  });
}
