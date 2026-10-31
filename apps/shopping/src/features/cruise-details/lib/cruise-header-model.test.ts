import type { CategoryPricingAvailability } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import {
  brandLabel,
  formatMoney,
  nightsLabel,
  remainingLabel,
  toCruiseContextCardModel,
  toCruiseHeaderModel,
  tripRoute,
} from './cruise-header-model.ts';

const CRUISE: CategoryPricingAvailability = {
  cruiseId: 'OSK261007',
  cruiseName: 'Venice, the Adriatic & Greece',
  shipName: 'VIKING SKY',
  brand: 'Ocean',
  itinerary: {
    fromPort: 'Venice (Chioggia)',
    toPort: 'Athens (Piraeus)',
    fromPortCode: 'C11',
    toPortCode: 'PIR',
  },
  sailingDateFrom: '2027-07-01',
  sailingDateTo: '2027-07-07',
  nights: 7,
  availabilityStatus: 'Available',
  availableToSell: 55,
  categories: [],
};

describe('brandLabel', () => {
  it('pluralises the families the designs tag', () => {
    expect(brandLabel('Ocean')).toBe('Oceans');
    expect(brandLabel('River')).toBe('Rivers');
    expect(brandLabel('Mississippi')).toBe('Mississippi');
  });

  it('passes an unmapped brand through rather than guessing a plural', () => {
    expect(brandLabel('Expeditions')).toBe('Expeditions');
  });

  it('yields no tag at all when the wire carried no brand', () => {
    expect(brandLabel(undefined)).toBeUndefined();
  });
});

describe('remainingLabel', () => {
  it('caps the count the way the frames do', () => {
    expect(remainingLabel(55)).toBe('9+ remaining');
    expect(remainingLabel(10)).toBe('9+ remaining');
  });

  it('shows a small count exactly', () => {
    expect(remainingLabel(9)).toBe('9 remaining');
    expect(remainingLabel(4)).toBe('4 remaining');
  });

  it('says sold out rather than "0 remaining"', () => {
    expect(remainingLabel(0)).toBe('Sold out');
  });

  it('renders nothing when the count is unknown, rather than claiming sold out', () => {
    // The wire field is optional. Collapsing absent into 0 would print "Sold out" over a
    // bookable sailing — a wrong fact stated with full confidence.
    expect(remainingLabel(undefined)).toBeUndefined();
  });
});

describe('nightsLabel', () => {
  it('shows cruise and total nights when the package runs longer than the sailing', () => {
    // HRJ270315T: 7 nights on board inside an 11-night package (ShoppingApp_UX-VD 1043:176419).
    expect(nightsLabel(7, 11)).toBe('7 Cruise Nights / 11 Total Nights');
  });

  it('shows the cruise nights alone when there are no extra package nights', () => {
    expect(nightsLabel(14, 14)).toBe('14 Cruise Nights');
  });

  it('shows the cruise nights alone when the total is unknown, never inventing one', () => {
    expect(nightsLabel(7, undefined)).toBe('7 Cruise Nights');
  });

  it('says "Night" for one', () => {
    expect(nightsLabel(1, 1)).toBe('1 Cruise Night');
    expect(nightsLabel(1, 3)).toBe('1 Cruise Night / 3 Total Nights');
  });
});

describe('formatMoney', () => {
  it('formats the footer total the way the frames do', () => {
    expect(formatMoney(33455, 'USD')).toBe('$33,455.00 USD');
  });

  it('follows the office currency rather than assuming dollars', () => {
    expect(formatMoney(0, 'EUR')).toBe('€0.00 EUR');
  });
});

describe('toCruiseContextCardModel', () => {
  it('shows a cruise-only sailing as embark and debark', () => {
    expect(toCruiseContextCardModel(CRUISE).itinerary).toEqual([
      {
        variant: 'departure',
        date: '01 JUL 2027 (THU)',
        cityCode: 'C11',
        cityName: 'Venice (Chioggia)',
      },
      {
        variant: 'arrival',
        date: '07 JUL 2027 (WED)',
        cityCode: 'PIR',
        cityName: 'Athens (Piraeus)',
      },
    ]);
  });

  it('wraps the sailing with the land package hotels a cruise tour is sold with', () => {
    const tour = {
      ...CRUISE,
      landPackage: {
        start: { date: '2027-06-29', portCode: 'VCE', portName: 'Venice' },
        end: { date: '2027-07-09', portCode: 'ATH', portName: 'Athens' },
      },
    };
    expect(toCruiseContextCardModel(tour).itinerary).toEqual([
      { variant: 'hotel', date: '29 JUN 2027 (TUE)', cityCode: 'VCE', cityName: 'Venice' },
      {
        variant: 'departure',
        date: '01 JUL 2027 (THU)',
        cityCode: 'C11',
        cityName: 'Venice (Chioggia)',
      },
      {
        variant: 'arrival',
        date: '07 JUL 2027 (WED)',
        cityCode: 'PIR',
        cityName: 'Athens (Piraeus)',
      },
      { variant: 'hotel', date: '09 JUL 2027 (FRI)', cityCode: 'ATH', cityName: 'Athens' },
    ]);
  });

  it('shows only the side of the package that exists', () => {
    const preOnly = {
      ...CRUISE,
      landPackage: { start: { date: '2027-06-29', portCode: 'VCE', portName: 'Venice' } },
    };
    expect(toCruiseContextCardModel(preOnly).itinerary.map((stop) => stop.variant)).toEqual([
      'hotel',
      'departure',
      'arrival',
    ]);
  });

  it('labels a package with both its cruise and total nights', () => {
    expect(toCruiseContextCardModel({ ...CRUISE, totalNights: 11 }).nightsLabel).toBe(
      '7 Cruise Nights / 11 Total Nights',
    );
  });

  // An Expedition sailing (e.g. Antarctic Explorer, XPO271113T) must wear its own brand chip.
  // The bug was an unmapped brand silently falling through to the 'oceans' default.
  it('marks each brand with its own chip, and does not default Expedition to Oceans', () => {
    expect(toCruiseContextCardModel({ ...CRUISE, brand: 'Expedition' }).category).toBe(
      'expeditions',
    );
    expect(toCruiseContextCardModel({ ...CRUISE, brand: 'River' }).category).toBe('rivers');
    expect(toCruiseContextCardModel(CRUISE).category).toBe('oceans');
  });

  // A sailing that returns to its embark port (Ushuaia → Ushuaia on XPO271113T) must read as
  // "Roundtrip", not repeat the city. Keyed off the displayed endpoints, not the raw sailing
  // ports, so a cruise tour that truly starts and ends elsewhere stays a one-way.
  it('flags a sailing that returns to its origin as a roundtrip, dropping the repeated city', () => {
    const loop = {
      ...CRUISE,
      itinerary: {
        ...CRUISE.itinerary,
        toPort: CRUISE.itinerary.fromPort,
        toPortCode: CRUISE.itinerary.fromPortCode,
      },
    };
    const model = toCruiseContextCardModel(loop);
    expect(model.roundtrip).toBe(true);
    expect(model.from).toBe('Venice (Chioggia)');
    expect(model.to).toBeUndefined();
  });

  it('keeps a one-way sailing as from → to with no roundtrip flag', () => {
    const model = toCruiseContextCardModel(CRUISE);
    expect(model.roundtrip).toBeUndefined();
    expect(model.from).toBe('Venice (Chioggia)');
    expect(model.to).toBe('Athens (Piraeus)');
  });
});

describe('toCruiseHeaderModel', () => {
  it('labels a package with both its cruise and total nights', () => {
    expect(toCruiseHeaderModel({ ...CRUISE, totalNights: 11 }).nightsLabel).toBe(
      '7 Cruise Nights / 11 Total Nights',
    );
  });

  it('omits the tag and the count when the wire carried neither', () => {
    const sparse = { ...CRUISE };
    delete (sparse as { brand?: string }).brand;
    delete (sparse as { availableToSell?: number }).availableToSell;

    const model = toCruiseHeaderModel(sparse);
    expect(model.brandTag).toBeUndefined();
    expect(model.remaining).toBeUndefined();
    // Identity still renders — a missing optional must not blank the header.
    expect(model.cruiseName).toBe('Venice, the Adriatic & Greece');
  });

  it('derives every field the header renders', () => {
    expect(toCruiseHeaderModel(CRUISE)).toEqual({
      brandTag: 'Oceans',
      cruiseName: 'Venice, the Adriatic & Greece',
      shipName: 'VIKING SKY',
      cruiseId: 'OSK261007',
      route: 'Venice (Chioggia) → Athens (Piraeus)',
      nightsLabel: '7 Cruise Nights',
      embark: '01 JUL 2027 (THU) C11 · Venice (Chioggia)',
      debark: '07 JUL 2027 (WED) PIR · Athens (Piraeus)',
      remaining: '9+ remaining',
    });
  });
});

describe('tripRoute', () => {
  const TOUR = {
    ...CRUISE,
    itinerary: { fromPort: 'Basel', toPort: 'Trier', fromPortCode: 'BSL', toPortCode: 'TRI' },
    landPackage: {
      start: { date: '2027-03-20', portCode: 'ZRH', portName: 'Zurich' },
      end: { date: '2027-03-31', portCode: 'PAR', portName: 'Paris' },
    },
  };

  it("runs a cruise tour from the land package's first city to its last", () => {
    expect(tripRoute(TOUR)).toEqual({ from: 'Zurich', to: 'Paris' });
  });

  it('keeps the sailing end that has no hotel beyond it', () => {
    // XPO: a Buenos Aires hotel before embarkation, nothing after debarking in Ushuaia.
    const { end: _none, ...startOnly } = TOUR.landPackage;
    expect(tripRoute({ ...TOUR, landPackage: startOnly })).toEqual({ from: 'Zurich', to: 'Trier' });
  });

  it('is the sailing itself for a cruise with no land package', () => {
    expect(tripRoute(CRUISE)).toEqual({
      from: 'Venice (Chioggia)',
      to: 'Athens (Piraeus)',
    });
  });

  it('drives both the header route and the context card', () => {
    expect(toCruiseHeaderModel(TOUR).route).toBe('Zurich → Paris');
    expect(toCruiseContextCardModel(TOUR)).toMatchObject({ from: 'Zurich', to: 'Paris' });
  });
});
