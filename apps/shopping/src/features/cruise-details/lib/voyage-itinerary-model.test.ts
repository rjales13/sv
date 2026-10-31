import type { ExtensionStay, VoyagePort } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import {
  type ItineraryHotelStay,
  toHotelStays,
  toItineraryStops,
} from './voyage-itinerary-model.ts';

// scheduleTags and portLabel are private; tests drive them through toItineraryStops.

// The adapter normalises EVO's two "unknown time" sentinels ('' on a port, null on a
// schedule) to absent, so the curated shape these tests build simply omits them.
function makePort(overrides: Partial<VoyagePort> = {}): VoyagePort {
  return {
    code: 'TST',
    name: 'Test Port',
    date: '2027-03-22T00:00:00',
    schedules: [],
    ...overrides,
  };
}

describe('toItineraryStops — Dock label (DK schedule)', () => {
  it('uses "Dock" as label for a port-variant stop with DK schedule', () => {
    // Three ports so index 1 gets the 'port' variant (not departure/arrival).
    const ports: VoyagePort[] = [
      makePort({ code: 'DEP', name: 'Depart' }),
      makePort({
        code: 'BSL',
        name: 'Basel',
        date: '2027-03-23T00:00:00',
        schedules: [{ code: 'DK', description: 'DOCK' }],
      }),
      makePort({ code: 'END', name: 'End', date: '2027-03-24T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[1]?.label).toBe('Dock');
  });

  it('uses "In Port" when no DK schedule is present', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'DEP', name: 'Depart' }),
      makePort({ code: 'BSL', name: 'Basel', date: '2027-03-23T00:00:00', schedules: [] }),
      makePort({ code: 'END', name: 'End', date: '2027-03-24T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[1]?.label).toBe('In Port');
  });
});

describe('toItineraryStops — overnight in port tag', () => {
  it('emits "Overnight in port" when the same port code appears on consecutive calendar days', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'TRI', name: 'Trier', date: '2027-03-28T00:00:00' }),
      makePort({ code: 'TRI', name: 'Trier', date: '2027-03-29T00:00:00' }),
      makePort({ code: 'END', name: 'End', date: '2027-03-30T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.tags).toContain('Overnight in port');
    expect(stops[1]?.tags).toContain('Overnight in port');
  });

  it('does not emit "Overnight in port" for a port that appears only once', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'TST', name: 'Single', date: '2027-03-22T00:00:00' }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.tags ?? []).not.toContain('Overnight in port');
  });

  it('does not emit "Overnight in port" for the same code on non-consecutive days', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'TST', name: 'Port A', date: '2027-03-22T00:00:00' }),
      makePort({ code: 'MID', name: 'Mid', date: '2027-03-23T00:00:00' }),
      makePort({ code: 'TST', name: 'Port A', date: '2027-03-24T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.tags ?? []).not.toContain('Overnight in port');
    expect(stops[2]?.tags ?? []).not.toContain('Overnight in port');
  });
});

describe('toItineraryStops — boarding tag (R3)', () => {
  it('emits "Board 15:00" when boardingBeginsTime is "1500"', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'BSL', name: 'Basel', boardingBeginsTime: '1500' }),
      makePort({ code: 'END', name: 'End Port', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.tags).toContain('Board 15:00');
  });

  it('does not emit a boarding tag when boardingBeginsTime is empty', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'BSL', name: 'Basel', boardingBeginsTime: '' }),
      makePort({ code: 'END', name: 'End Port', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.tags ?? []).not.toContain(expect.stringMatching(/^Board/));
  });
});

// The narrative now arrives ON the port, joined by the adapter, instead of being passed in
// as a second lookup argument — so these drive it through `description`.
describe('toItineraryStops — port descriptions (R2)', () => {
  it('puts description into overview (revealed on expand)', () => {
    const ports: VoyagePort[] = [
      makePort({
        code: 'IST',
        name: 'Istanbul',
        description: 'Embark your ship and settle into your stateroom.',
      }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.overview).toBe('Embark your ship and settle into your stateroom.');
  });

  it('shows the short description as the always-visible line (ShoppingApp_UX-VD 906:118908)', () => {
    const ports: VoyagePort[] = [
      makePort({
        code: 'SXB',
        name: 'Strasbourg',
        shortDescription: 'Encounter this multicultural city.',
      }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.summary).toBe('Encounter this multicultural city.');
    // Nothing longer to reveal, so the row gets no expand affordance.
    expect(stops[0]?.overview).toBeUndefined();
  });

  it('keeps the port name as the line when AEM has no short description', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'IST', name: 'Istanbul', description: 'Embark your ship.' }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.summary).toBe('Istanbul');
  });

  it('summary is port name when no description provided', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'IST', name: 'Istanbul' }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.summary).toBe('Istanbul');
    expect(stops[0]?.overview).toBeUndefined();
  });

  it('sets overview for any non-empty description, including short ones', () => {
    const shortDesc = 'Embark your ship and settle into your stateroom.';
    const ports: VoyagePort[] = [
      makePort({ code: 'IST', name: 'Istanbul', description: shortDesc }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    // short description still gets an overview so the row has an expand affordance
    expect(stops[0]?.overview).toBe(shortDesc);
  });

  it('leaves overview undefined when no description exists for the port', () => {
    const ports: VoyagePort[] = [
      makePort({ code: 'IST', name: 'Istanbul' }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[0]?.overview).toBeUndefined();
  });
});

describe('toItineraryStops — day stamp', () => {
  it('stamps each new day as day-month with the weekday', () => {
    const stops = toItineraryStops([
      makePort({ code: 'TST', date: '2027-03-22T00:00:00' }),
      makePort({ code: 'END', name: 'End', date: '2027-03-23T00:00:00' }),
    ]);
    expect(stops[0]?.day).toEqual({ ordinal: 'DAY 1', date: '22 MAR (MON)' });
  });
});

// A cruise tour's land-package hotels are not port calls, so GetVoyageItinerary never lists
// them — the tab passes them in from the extensions offering.
describe('toItineraryStops — at anchor (AN schedule)', () => {
  it('draws an anchored call with the port ship icon, labelled "At Anchor"', () => {
    // Monte Carlo (OVS) anchors offshore; it is still a port call, so it shares the Dock
    // glyph rather than the sailboat.
    const ports: VoyagePort[] = [
      makePort({ code: 'DEP', name: 'Depart' }),
      makePort({
        code: 'MCM',
        name: 'Monte Carlo',
        date: '2027-03-23T00:00:00',
        schedules: [{ code: 'AN', description: 'AT ANCHOR' }],
      }),
      makePort({ code: 'END', name: 'End', date: '2027-03-24T00:00:00' }),
    ];

    const stop = toItineraryStops(ports)[1];

    expect(stop?.variant).toBe('port');
    expect(stop?.label).toBe('At Anchor');
  });
});

describe('toItineraryStops — badge order', () => {
  it('puts every time badge last, after attributes like "Overnight in port"', () => {
    // Trier on HID270322T: debarks the morning after an overnight. Times always sit at the
    // right edge of the row, whatever else the row carries.
    const ports: VoyagePort[] = [
      makePort({ code: 'DEP', name: 'Depart', date: '2027-03-28T00:00:00' }),
      makePort({
        code: 'TRI',
        name: 'Trier',
        date: '2027-03-28T00:00:00',
        schedules: [
          { code: 'AR', description: 'ARRIVE', time: '0800' },
          { code: 'DP', description: 'DEPART', time: '1800' },
        ],
      }),
      makePort({
        code: 'TRI',
        name: 'Trier',
        date: '2027-03-29T00:00:00',
        boardingBeginsTime: '1500',
      }),
    ];

    const stops = toItineraryStops(ports);

    expect(stops[1]?.tags).toEqual(['Overnight in port', 'Arrive 08:00', 'Depart 18:00']);
    expect(stops[2]?.tags).toEqual(['Overnight in port', 'Board 15:00']);
  });
});

describe('toItineraryStops — land-package hotels', () => {
  const SAILING: VoyagePort[] = [
    makePort({ code: 'BSL', name: 'Basel', date: '2027-03-22T00:00:00' }),
    makePort({ code: 'SXB', name: 'Strasbourg', date: '2027-03-23T00:00:00' }),
    // Consecutive, as EVO lists every sailing day.
    makePort({ code: 'TRI', name: 'Trier', date: '2027-03-24T00:00:00' }),
  ];
  const ZURICH: ItineraryHotelStay = {
    code: 'ZRH',
    city: 'Zurich',
    hotelName: 'Zurich Hotel',
    checkIn: '2027-03-20T00:00:00',
    checkOut: '2027-03-22T00:00:00',
    shortDescription: 'See landmarks including the Rathaus.',
    description: 'Overlooking Lake Zürich…',
  };
  const PARIS: ItineraryHotelStay = {
    code: 'PAR',
    city: 'Paris',
    hotelName: 'Paris Hotel',
    checkIn: '2027-03-24T00:00:00',
    checkOut: '2027-03-26T00:00:00',
  };

  it('puts a hotel before the sailing first, spanning its stay (ShoppingApp_UX-VD 906:118908)', () => {
    const stops = toItineraryStops(SAILING, [ZURICH]);
    expect(stops[0]).toMatchObject({
      variant: 'hotel',
      port: 'Zurich (ZRH)',
      label: 'Zurich Hotel',
      day: { ordinal: 'DAY 1', date: '20 MAR (SAT)' },
      through: { ordinal: 'DAY 3', date: '22 MAR (MON)' },
      summary: 'See landmarks including the Rathaus.',
      overview: 'Overlooking Lake Zürich…',
    });
  });

  it('numbers the days from the start of the trip, so embarkation is DAY 3', () => {
    const stops = toItineraryStops(SAILING, [ZURICH]);
    expect(stops[1]).toMatchObject({ port: 'Basel (BSL)', day: { ordinal: 'DAY 3' } });
    expect(stops[3]).toMatchObject({ port: 'Trier (TRI)', day: { ordinal: 'DAY 5' } });
  });

  it('puts a hotel after the sailing last, from check-in to check-out', () => {
    const stops = toItineraryStops(SAILING, [ZURICH, PARIS]);
    expect(stops.at(-1)).toMatchObject({
      variant: 'hotel',
      port: 'Paris (PAR)',
      day: { ordinal: 'DAY 5', date: '24 MAR (WED)' },
      through: { ordinal: 'DAY 7', date: '26 MAR (FRI)' },
      // No AEM copy for this stay: the city stands in, and there is nothing to expand.
      summary: 'Paris',
    });
    expect(stops.at(-1)?.overview).toBeUndefined();
  });

  it('places a stay by its dates, not by its order in the offering', () => {
    const stops = toItineraryStops(SAILING, [PARIS, ZURICH]);
    expect(stops.map((s) => s.port)).toEqual([
      'Zurich (ZRH)',
      'Basel (BSL)',
      'Strasbourg (SXB)',
      'Trier (TRI)',
      'Paris (PAR)',
    ]);
  });

  it('keeps DAY 1 at embarkation for a cruise with no hotels', () => {
    expect(toItineraryStops(SAILING)[0]?.day?.ordinal).toBe('DAY 1');
  });
});

describe('toHotelStays', () => {
  const stay = (over: Partial<ExtensionStay>): ExtensionStay => ({
    code: '061',
    title: 'Zurich Hotel',
    category: 'pre',
    nights: 2,
    fromDate: '2027-03-20T00:00:00',
    toDate: '2027-03-22T00:00:00',
    hotel: { code: 'ZRHHTL', name: 'Zurich Hotel', city: 'Zurich', portCode: 'ZRH' },
    ...over,
  });

  it('turns a stay into a hotel row with its AEM city copy', () => {
    const [hotel] = toHotelStays([stay({})], { ZRH: { shortDescription: 'See the Rathaus.' } });
    expect(hotel).toMatchObject({
      code: 'ZRH',
      city: 'Zurich',
      hotelName: 'Zurich Hotel',
      checkIn: '2027-03-20T00:00:00',
      checkOut: '2027-03-22T00:00:00',
      shortDescription: 'See the Rathaus.',
    });
  });

  it("falls back to the stay's title for a hotel delivered without a city (XPO Buenos Aires)", () => {
    const [hotel] = toHotelStays([
      stay({
        title: 'Buenos Aires Hotel',
        hotel: { code: 'BUEHTL', name: 'Buenos Aires Hotel', portCode: 'BUE' },
      }),
    ]);
    expect(hotel?.city).toBe('Buenos Aires');
  });

  it('skips a stay with no hotel to place on the timeline', () => {
    const { hotel: _none, ...noHotel } = stay({});
    expect(toHotelStays([noHotel as ExtensionStay])).toEqual([]);
  });
});
