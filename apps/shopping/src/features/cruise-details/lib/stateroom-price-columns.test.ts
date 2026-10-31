// @vitest-environment node

import type { CategoryPricing, CategoryPricingAvailability } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import { toCruiseCardModel } from '@/features/search/lib/results-view-model.ts';
import { toStateroomPriceColumns } from './stateroom-price-columns.ts';

// The Staterooms price grid and the search result card show the same categories. An agent
// moves between them on a call, so a category must read the same in both: EVO's own code on
// the badge, and the same availability colour.

const category = (overrides: Partial<CategoryPricing>): CategoryPricing => ({
  categoryClass: '01',
  abbrev: 'A',
  description: 'A-VERANDA STATEROOM',
  currency: 'USD',
  doublePrice: 2899,
  singlePrice: 5798,
  status: ' ',
  openCabinsAvailable: 20,
  gtyCabinsAvailable: 0,
  ...overrides,
});

const CATEGORIES: CategoryPricing[] = [
  category({
    abbrev: 'ES',
    description: 'ES-EXPLORER SUITE',
    doublePrice: 7199,
    openCabinsAvailable: 1,
  }),
  category({ abbrev: 'A', doublePrice: 2899, openCabinsAvailable: 20 }),
  category({ abbrev: 'B', doublePrice: 2699, openCabinsAvailable: 3 }),
  category({
    abbrev: 'C',
    description: 'C-FRENCH BALCONY',
    doublePrice: 2499,
    openCabinsAvailable: 4,
  }),
  category({
    abbrev: 'D',
    description: 'D-FRENCH BALCONY',
    doublePrice: 2299,
    openCabinsAvailable: 0,
  }),
];

const items = (columns: ReturnType<typeof toStateroomPriceColumns>) =>
  columns.flatMap((column) => column.items);

describe('toStateroomPriceColumns', () => {
  it('labels each category with EVO’s own code, not its position in the column', () => {
    // Category B is the second row of "Veranda Stateroom". It used to read "B2" — a code
    // that exists nowhere in EVO.
    const rows = items(toStateroomPriceColumns(CATEGORIES, 'USD', null));
    expect(rows.map((row) => row.abbrev)).toEqual(['ES', 'A', 'B', 'C', 'D']);
  });

  it('colours green while any cabin is open, red when none are left or the category is closed', () => {
    const closed = category({
      abbrev: 'F',
      description: 'F-STANDARD',
      status: 'C',
      openCabinsAvailable: 9,
    });
    const status = Object.fromEntries(
      items(toStateroomPriceColumns([...CATEGORIES, closed], 'USD', null)).map((row) => [
        row.abbrev,
        row.status,
      ]),
    );
    expect(status).toEqual({
      ES: 'available',
      A: 'available',
      B: 'available',
      C: 'available',
      D: 'soldout',
      F: 'soldout',
    });
  });

  it('marks the selected category', () => {
    const rows = items(toStateroomPriceColumns(CATEGORIES, 'USD', 'B'));
    expect(rows.find((row) => row.selected)?.abbrev).toBe('B');
  });
});

describe('the Staterooms grid and the search result card agree', () => {
  it('give every category the same code and the same colour', () => {
    const cruise = {
      cruiseId: 'HID270322T',
      cruiseName: 'Paris to the Swiss Alps',
      shipName: 'VIKING HILD',
      itinerary: { fromPort: 'Basel', toPort: 'Trier', fromPortCode: 'BSL', toPortCode: 'TRI' },
      sailingDateFrom: '2027-03-22',
      sailingDateTo: '2027-03-29',
      nights: 7,
      availabilityStatus: 'Available',
      categories: CATEGORIES,
    } satisfies CategoryPricingAvailability;

    const badges = (rows: { abbrev: string; status?: string | undefined }[]) =>
      rows.map((row) => `${row.abbrev}:${row.status}`).sort();

    expect(badges(items(toStateroomPriceColumns(CATEGORIES, 'USD', null)))).toEqual(
      badges(toCruiseCardModel(cruise).pricingColumns.flatMap((column) => column.items)),
    );
  });
});
