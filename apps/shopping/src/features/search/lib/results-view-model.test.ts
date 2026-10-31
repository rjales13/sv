import type { CategoryPricingAvailability } from '@vikings/contracts';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CANNED_RESULTS,
  GRAND_EUROPEAN,
  PHARAOHS_PYRAMIDS,
  RHINE_GETAWAY,
} from '../test/search-fixtures.mock.ts';
import {
  applySortAndFilter,
  filterResultsByText,
  type ResultSortKey,
  sortResults,
  startingPriceOf,
  toCruiseCardModel,
} from './results-view-model.ts';

// FR3.2 client-side sort/filter is pure and deterministic here; the view wires
// these helpers to controls and renders cards. `toCruiseCardModel` is the FR3.1
// card mapping.

const names = (results: { cruiseName: string }[]) => results.map((r) => r.cruiseName);

describe('sortResults (FR3.2)', () => {
  it('sorts by cruise name ascending', () => {
    expect(names(sortResults(CANNED_RESULTS, 'name'))).toEqual([
      'Grand European',
      'Pharaohs & Pyramids',
      'Rhine Getaway',
    ]);
  });

  it('sorts by nights ascending', () => {
    expect(names(sortResults(CANNED_RESULTS, 'nights'))).toEqual([
      'Rhine Getaway',
      'Pharaohs & Pyramids',
      'Grand European',
    ]);
  });

  it('sorts by departure date ascending', () => {
    expect(names(sortResults(CANNED_RESULTS, 'departure'))).toEqual([
      'Pharaohs & Pyramids',
      'Rhine Getaway',
      'Grand European',
    ]);
  });

  it('does not mutate the input array', () => {
    const original = [...CANNED_RESULTS];
    sortResults(CANNED_RESULTS, 'nights');
    expect(CANNED_RESULTS).toEqual(original);
  });
});

// VCX-10323 negative check: "No price sort or min/max price control." Asserted here rather
// than left to review, because the price comparators existed once and a helpful re-add is the
// easiest way for this to regress.
describe('sort keys (VCX-10323 negative check)', () => {
  it('offers no price-based ordering', () => {
    const keys: ResultSortKey[] = ['name', 'departure', 'nights'];
    for (const key of keys) expect(key).not.toMatch(/price/i);
    // A price key would have to be added to the union to be usable, so the union IS the guard:
    // this file would stop compiling if `ResultSortKey` grew one and it were not listed above.
    expectTypeOf<ResultSortKey>().toEqualTypeOf<'name' | 'departure' | 'nights'>();
  });
});

describe('filterResultsByText (FR3.2)', () => {
  it('narrows by a case-insensitive substring of cruise or ship name', () => {
    expect(names(filterResultsByText(CANNED_RESULTS, 'rhine'))).toEqual(['Rhine Getaway']);
    expect(filterResultsByText(CANNED_RESULTS, 'viking')).toHaveLength(3); // all ship names
  });

  it('returns the full set for an empty query', () => {
    expect(filterResultsByText(CANNED_RESULTS, '   ')).toHaveLength(3);
  });
});

describe('applySortAndFilter (FR3.2)', () => {
  it('filters first, then sorts the surviving set', () => {
    const out = applySortAndFilter(CANNED_RESULTS, { sort: 'departure', query: 'viking s' });
    // "Viking Sobek" and "Viking Sky" match; ordered by departure date.
    expect(names(out)).toEqual(['Pharaohs & Pyramids', 'Grand European']);
  });
});

describe('toCruiseCardModel (FR3.1 card mapping)', () => {
  it("lists a cruise tour's land package hotels around the sailing", () => {
    const tour = {
      ...RHINE_GETAWAY,
      landPackage: {
        start: { date: '2027-03-13', portCode: 'PAR', portName: 'Paris' },
        end: { date: '2027-03-24', portCode: 'ZRH', portName: 'Zürich' },
      },
    };
    const stops = toCruiseCardModel(tour).itinerary;
    expect(stops.map((stop) => stop.variant)).toEqual(['hotel', 'departure', 'arrival', 'hotel']);
    expect(stops[0]).toEqual({
      variant: 'hotel',
      date: '13 MAR 2027 (SAT)',
      cityCode: 'PAR',
      cityName: 'Paris',
    });
    expect(stops[3]?.cityName).toBe('Zürich');
  });

  it('derives the starting price from the lowest category double price', () => {
    expect(startingPriceOf(RHINE_GETAWAY)).toBe(3000);
    const model = toCruiseCardModel(RHINE_GETAWAY);
    expect(model.title).toBe('Rhine Getaway');
    expect(model.from).toBe('Basel');
    expect(model.to).toBe('Amsterdam');
    expect(model.amount).toContain('3,000');
    expect(model.soldOut).toBe(false);
    // Two categories with distinct descriptions → two columns.
    expect(model.pricingColumns).toHaveLength(2);
  });

  it('labels a package with its cruise and total nights (ShoppingApp_UX-VD 1043:176419)', () => {
    const model = toCruiseCardModel({ ...RHINE_GETAWAY, nights: 7, totalNights: 11 });
    expect(model.nightsLabel).toBe('7 Cruise Nights / 11 Total Nights');
  });

  it('labels a cruise-only sailing with its cruise nights alone', () => {
    const model = toCruiseCardModel({ ...RHINE_GETAWAY, nights: 7, totalNights: 7 });
    expect(model.nightsLabel).toBe('7 Cruise Nights');
  });

  it('routes a cruise tour from its first hotel city to its last, like the details header', () => {
    const model = toCruiseCardModel({
      ...RHINE_GETAWAY,
      landPackage: {
        start: { date: '2027-03-20', portCode: 'ZRH', portName: 'Zurich' },
        end: { date: '2027-03-31', portCode: 'PAR', portName: 'Paris' },
      },
    });
    expect(model).toMatchObject({ from: 'Zurich', to: 'Paris' });
  });

  it('flags a sold-out sailing from its availability status', () => {
    const model = toCruiseCardModel(GRAND_EUROPEAN);
    expect(model.soldOut).toBe(true);
  });

  it('maps brand to the correct category', () => {
    expect(toCruiseCardModel(RHINE_GETAWAY).category).toBe('rivers');
    expect(toCruiseCardModel(GRAND_EUROPEAN).category).toBe('oceans');
    // Expedition must resolve to its own chip, not fall through to the 'oceans' default.
    expect(toCruiseCardModel({ ...RHINE_GETAWAY, brand: 'Expedition' }).category).toBe(
      'expeditions',
    );
  });

  it('groups same-type EVO categories into one column', () => {
    const result: CategoryPricingAvailability = {
      ...RHINE_GETAWAY,
      categories: [
        {
          categoryClass: '03',
          abbrev: 'A',
          description: 'A-VERANDA STATEROOM',
          currency: 'USD',
          doublePrice: 4000,
          singlePrice: 8000,
          status: 'OPEN',
          openCabinsAvailable: 18,
          gtyCabinsAvailable: 0,
        },
        {
          categoryClass: '04',
          abbrev: 'B',
          description: 'B-VERANDA STATEROOM',
          currency: 'USD',
          doublePrice: 3800,
          singlePrice: 7600,
          status: 'OPEN',
          openCabinsAvailable: 17,
          gtyCabinsAvailable: 0,
        },
        {
          categoryClass: '01',
          abbrev: 'ES',
          description: 'ES-EXPLORER SUITE',
          currency: 'USD',
          doublePrice: 9000,
          singlePrice: 18000,
          status: 'OPEN',
          openCabinsAvailable: 1,
          gtyCabinsAvailable: 0,
        },
      ],
    };
    const model = toCruiseCardModel(result);
    // A + B share "Veranda Stateroom" → 1 column; ES → 1 column = 2 total.
    expect(model.pricingColumns).toHaveLength(2);
    const verandaCol = model.pricingColumns.find((c) => c.title === 'Veranda Stateroom');
    expect(verandaCol?.items).toHaveLength(2);
  });

  it('formats remaining cabins with 9+ cap', () => {
    expect(toCruiseCardModel(RHINE_GETAWAY).remaining).toBe('9+ remaining');
    expect(toCruiseCardModel(PHARAOHS_PYRAMIDS).remaining).toBe('4 remaining');
    expect(toCruiseCardModel(GRAND_EUROPEAN).remaining).toBe('0 remaining');
  });
});
