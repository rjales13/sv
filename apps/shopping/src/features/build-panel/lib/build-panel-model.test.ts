// @vitest-environment node

import type { CategoryPricingAvailability } from '@vas/contracts';
import { describe, expect, it } from 'vitest';
import { SAMPLE_AIR_PRICING } from '@/features/cr-details/test-support/air-pricing-stub.ts';
import { SAMPLE_EXTENSIONS } from '@/features/cr-details/test-support/extensions-stub.ts';
import type { crChoices } from '@/store/cr-workspace.store.ts';
import {
  MOCK_GUEST_NAMES,
  TPP_PRICE_USD,
  toBuildPanelModel,
  toGuestLabel,
} from './build-panel-model.ts';

const cr: CategoryPricingAvailability = {
  crId: 'HRJ270426T',
  crName: 'Paris to the Swiss Alps',
  shipName: 'VA Herja',
  nights: 7,
  sailingDateFrom: '2027-07-01',
  sailingDateTo: '2027-07-12',
  availabilityStatus: 'Available',
  itinerary: {
    fromPort: 'Paris',
    toPort: 'Basel',
    fromPortCode: 'CDG',
    toPortCode: 'BSL',
  },
  categories: [
    {
      categoryClass: 'A',
      abbrev: 'A',
      description: 'Category A',
      currency: 'USD',
      doublePrice: 4999,
      singlePrice: 6999,
      status: 'Available',
      openCabinsAvailable: 5,
      gtyCabinsAvailable: 0,
    },
  ],
};

const firstCategory = cr.categories[0] as CategoryPricingAvailability['categories'][number];

const emptyChoices: crChoices = {
  extensionIds: [],
  air: {},
  travelProtection: {},
};

/** Add-ons are only billed once a cabin is held, so every pricing test starts from one. */
const withCabin: crChoices = {
  ...emptyChoices,
  stateroom: { categoryAbbrev: 'A', cabinNumber: '101', deck: 1 },
};

describe('toGuestLabel', () => {
  it('formats "Guest 1" for index 0', () => {
    expect(toGuestLabel(0)).toBe('Guest 1');
  });

  it('formats "Guest 2" for index 1', () => {
    expect(toGuestLabel(1)).toBe('Guest 2');
  });
});

describe('toBuildPanelModel', () => {
  it('maps cr name and formatted dates into the header', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.title).toBe('Paris to the Swiss Alps');
    expect(model.startDate).toBe('01 JUL 2027 (THU)');
    expect(model.endDate).toBe('12 JUL 2027 (MON)');
  });

  it('includes ship, cr id, and nights in details', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.details).toContain('VA HERJA');
    expect(model.details).toContain('HRJ270426T');
    expect(model.details).toContain('7 cr Nights');
  });

  it('shows cr and total nights in details for a package (R3.2)', () => {
    const model = toBuildPanelModel({
      cr: { ...cr, totalNights: 11 },
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.details).toContain('7 cr Nights / 11 Total Nights');
  });

  it('carries the first promo code into the model', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: ['AGRDN26-3'],
    });
    expect(model.promoCode).toBe('AGRDN26-3');
  });

  // VCX-10484 R6 / AC 6: the badge names the promo that priced the cr. A partial code finds
  // a promo by part of its code, so what the agent typed is not always what was applied.
  it('calls out the promo that priced the cr over the code the agent typed', () => {
    const model = toBuildPanelModel({
      cr: { ...cr, appliedPromoCode: 'TIRRCR-156' },
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: ['RCR-15'],
    });
    expect(model.promoCode).toBe('TIRRCR-156');
  });

  // The mock and direct-EVO adapters do not say which promo priced a sailing.
  it('falls back to the typed code, without its spaces, when the cr names none', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: ['  AGRDN26-3 '],
    });
    expect(model.promoCode).toBe('AGRDN26-3');
  });

  it('omits promoCode when the typed code is only spaces', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: ['   '],
    });
    expect(model.promoCode).toBeUndefined();
  });

  it('omits promoCode when there are no promo codes', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.promoCode).toBeUndefined();
  });

  it('produces one guest column per guest count', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 2,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.guests).toHaveLength(2);
    expect(model.guests[0]?.label).toBe('Guest 1');
    expect(model.guests[1]?.label).toBe('Guest 2');
  });

  describe('before a cabin is selected', () => {
    // VCX-10332: the Staterooms screen presents no cabin pre-selected, so there is nothing to
    // price yet. The old fallback billed categories[0], which EVO orders price-DESCENDING —
    // it quoted the sailing's most expensive cabin.
    const unpriced = (choices: crChoices) =>
      toBuildPanelModel({
        cr: {
          ...cr,
          categories: [
            { ...firstCategory, abbrev: 'OS', doublePrice: 30000, singlePrice: 45000 },
            firstCategory,
          ],
        },
        choices,
        guests: 2,
        currency: 'USD',
        promoCodes: [],
        airPricing: SAMPLE_AIR_PRICING,
        extensions: SAMPLE_EXTENSIONS,
      });

    it('prices the whole panel at zero', () => {
      const model = unpriced(emptyChoices);
      expect(model.isPriced).toBe(false);
      expect(model.grossTotal).toBe('$0.00');
      expect(model.guests.map((g) => g.total)).toEqual(['$0.00', '$0.00']);
      expect(model.guests[0]?.sections[0]?.lines[0]?.amount).toBe('$0.00');
    });

    it('bills a chosen extension before the cabin, with the cr fare still at zero', () => {
      // An extension has its own price, independent of the stateroom: an agent who books the
      // Milan pre-stay first must see it in the breakdown and the total straight away.
      const model = unpriced({ ...emptyChoices, extensionIds: ['050'] });
      expect(model.isPriced).toBe(true);
      expect(model.guests[0]?.sections.map((s) => s.kind)).toEqual(['cr', 'hotel']);
      expect(model.guests[0]?.sections[0]?.lines[0]?.amount).toBe('$0.00');
      expect(model.guests.map((g) => g.total)).toEqual(['$1,500.00', '$1,500.00']);
      // The breakdown still adds up to the total it sits under.
      expect(model.grossTotal).toBe('$3,000.00');
    });

    it('still holds air and TPP until a cabin is chosen', () => {
      const model = unpriced({
        ...emptyChoices,
        travelProtection: { 'guest-0': true },
        air: {
          G1: {
            includeAirfare: true,
            originGateway: 'JFK',
            returnGateway: 'JFK',
            originClass: 'D',
            returnClass: 'D',
          },
        },
      });
      expect(model.grossTotal).toBe('$0.00');
      // A breakdown listing $5,898 of air under a $0.00 total would not add up.
      expect(model.guests[0]?.sections.map((s) => s.kind)).toEqual(['cr']);
    });

    it('stays at zero when the held category is no longer on the sailing', () => {
      const model = unpriced({
        ...emptyChoices,
        stateroom: { categoryAbbrev: 'GONE', cabinNumber: '101', deck: 1 },
      });
      expect(model.isPriced).toBe(false);
      expect(model.grossTotal).toBe('$0.00');
    });
  });

  // VA prices a cr tour as one fare covering the sailing AND its land stays, so the
  // breakdown names it "cr Tour Fare"; a cr-only sailing keeps "cr Fare".
  describe('fare label', () => {
    const fareLabel = (c: CategoryPricingAvailability) =>
      toBuildPanelModel({
        cr: c,
        choices: withCabin,
        guests: 1,
        currency: 'USD',
        promoCodes: [],
      }).guests[0]?.sections[0]?.lines[0]?.label;

    it('says "cr Fare" for a cr-only sailing', () => {
      expect(fareLabel(cr)).toBe('cr Fare');
    });

    it('says "cr Tour Fare" for a sailing sold with a land package', () => {
      const tour = {
        ...cr,
        totalNights: 11,
        landPackage: { start: { date: '2027-06-29', portCode: 'ZRH', portName: 'Zurich' } },
      };
      expect(fareLabel(tour)).toBe('cr Tour Fare');
    });

    it('treats total nights beyond the sailing as a tour, matching the header', () => {
      // The header reads "7 cr Nights / 11 Total Nights" from the same numbers, so the
      // breakdown must not call that sailing cr-only when the package ports are missing.
      expect(fareLabel({ ...cr, totalNights: 11 })).toBe('cr Tour Fare');
    });
  });

  it('prices the selected cabin, not the first category', () => {
    const model = toBuildPanelModel({
      cr: {
        ...cr,
        categories: [{ ...firstCategory, abbrev: 'OS', doublePrice: 30000 }, firstCategory],
      },
      choices: withCabin,
      guests: 2,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.isPriced).toBe(true);
    expect(model.grossTotal).toBe('$9,998.00');
  });

  it('formats the gross total in the requested currency', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 2,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.currencyCode).toBe('USD');
    // Gross total is a non-empty formatted string, e.g. "$9,998.00"
    expect(model.grossTotal).toMatch(/^\$/);
  });

  it('marks guest 1 as TPP-eligible and guest 2 as ineligible', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 2,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.guests[0]?.tpp.eligible).toBe(true);
    expect(model.guests[1]?.tpp.eligible).toBe(false);
  });

  it('reflects travelProtection choices from the store', () => {
    const choices: crChoices = {
      ...emptyChoices,
      travelProtection: { 'guest-0': true },
    };
    const model = toBuildPanelModel({
      cr,
      choices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    const tpp = model.guests[0]?.tpp;
    if (!tpp?.eligible) throw new Error('Expected eligible');
    expect(tpp.included).toBe(true);
  });

  it('includes the stateroom info in details when a cabin is selected', () => {
    const choices: crChoices = {
      ...emptyChoices,
      stateroom: { categoryAbbrev: 'A', cabinNumber: '101', deck: 1 },
    };
    const model = toBuildPanelModel({
      cr,
      choices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect(model.details.some((d) => d.includes('A') && d.includes('101'))).toBe(true);
  });

  it('exports the mock guest names and TPP_PRICE_USD constants', () => {
    expect(MOCK_GUEST_NAMES.length).toBeGreaterThanOrEqual(2);
    expect(typeof TPP_PRICE_USD).toBe('number');
    expect(TPP_PRICE_USD).toBeGreaterThan(0);
  });

  it('uses PROTOTYPE_GUESTS names for guest columns', () => {
    const model = toBuildPanelModel({
      cr,
      choices: emptyChoices,
      guests: 2,
      currency: 'USD',
      promoCodes: [],
    });
    // PROTOTYPE_GUESTS[0].name = 'Mr. John Smith Whitcombe'
    expect(model.guests[0]?.name).toBe('Mr. John Smith Whitcombe');
    expect(model.guests[1]?.name).toBe('Ms. Mary Stone Davis');
  });

  it('groups every selected extension into ONE hotel section with a single subtotal', () => {
    const model = toBuildPanelModel({
      cr,
      choices: { ...withCabin, extensionIds: ['050', '070'] },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      extensions: SAMPLE_EXTENSIONS,
    });
    const hotelSections = (model.guests[0]?.sections ?? []).filter((s) => s.kind === 'hotel');
    expect(hotelSections).toHaveLength(1);
    expect(hotelSections[0]?.lines).toEqual([
      { variant: 'list', label: 'Milan Extension - (PRE HOTEL)', amount: '$1,500.00' },
      { variant: 'list', label: 'Paris Extension - (POST HOTEL)', amount: '$900.00' },
      { variant: 'subtotal', label: 'Hotel Extensions Subtotal', amount: '$2,400.00' },
    ]);
  });

  it('adds a Travel Protection Plan section when the guest opts in', () => {
    const model = toBuildPanelModel({
      cr,
      choices: { ...withCabin, travelProtection: { 'guest-0': true } },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    const sections = model.guests[0]?.sections ?? [];
    expect(sections.map((s) => s.kind)).toEqual(['cr', 'protection']);
    expect(sections[1]?.lines).toEqual([
      { variant: 'list', label: 'Travel Protection Plan', amount: '$749.00' },
    ]);
    // Solo guest pays the single fare: $6,999 + $749 TPP.
    expect(model.guests[0]?.total).toBe('$7,748.00');
  });

  it('omits the Travel Protection Plan section when the box is unchecked', () => {
    const model = toBuildPanelModel({
      cr,
      choices: { ...withCabin, travelProtection: { 'guest-0': false } },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    const sections = model.guests[0]?.sections ?? [];
    expect(sections.find((s) => s.kind === 'protection')).toBeUndefined();
  });

  it('omits the Travel Protection Plan section before a cabin is held', () => {
    const model = toBuildPanelModel({
      cr,
      choices: { ...emptyChoices, travelProtection: { 'guest-0': true } },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    const sections = model.guests[0]?.sections ?? [];
    expect(sections.find((s) => s.kind === 'protection')).toBeUndefined();
  });

  it('orders the groups cr → hotel extensions → VA Air → TPP', () => {
    const model = toBuildPanelModel({
      cr,
      choices: {
        ...withCabin,
        extensionIds: ['050'],
        travelProtection: { 'guest-0': true },
        air: {
          G1: {
            includeAirfare: true,
            originGateway: 'JFK',
            originClass: 'D',
            returnGateway: 'JFK',
            returnClass: 'D',
          },
        },
      },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      airPricing: SAMPLE_AIR_PRICING,
      extensions: SAMPLE_EXTENSIONS,
    });
    expect((model.guests[0]?.sections ?? []).map((s) => s.kind)).toEqual([
      'cr',
      'hotel',
      'air',
      'protection',
    ]);
  });

  it('adds an extension hotel section for a selected extension', () => {
    // Selections are stored by EVO invcode now, not by position in a sorted list.
    const choices: crChoices = { ...withCabin, extensionIds: ['050'] };
    const model = toBuildPanelModel({
      cr,
      choices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      extensions: SAMPLE_EXTENSIONS,
    });
    const sections = model.guests[0]?.sections ?? [];
    const hotelSection = sections.find((s) => s.kind === 'hotel');
    expect(hotelSection).toBeDefined();
    expect(hotelSection?.lines.some((l) => l.label.includes('Milan Extension'))).toBe(true);
    // Priced from the number the port carries, not parsed back out of a formatted string.
    expect(hotelSection?.lines[0]?.amount).toBe('$1,500.00');
  });

  it('matches a selection by invcode, so reordering cannot re-price it', () => {
    // The previous model indexed into a sorted fixture with a stored number: moving an
    // extension up the list silently charged the agent for a different one.
    const reversed = {
      ...SAMPLE_EXTENSIONS,
      extensions: [...SAMPLE_EXTENSIONS.extensions].reverse(),
    };
    const model = toBuildPanelModel({
      cr,
      choices: { ...withCabin, extensionIds: ['050'] },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      extensions: reversed,
    });
    const hotelSection = (model.guests[0]?.sections ?? []).find((s) => s.kind === 'hotel');
    expect(hotelSection?.lines[0]?.label).toContain('Milan Extension');
    expect(hotelSection?.lines[0]?.amount).toBe('$1,500.00');
  });

  it('omits the extension section entirely while the offering is still loading', () => {
    const model = toBuildPanelModel({
      cr,
      choices: { ...withCabin, extensionIds: ['050'] },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect((model.guests[0]?.sections ?? []).find((s) => s.kind === 'hotel')).toBeUndefined();
  });

  it('includes extension amounts in the gross total', () => {
    const noExtModel = toBuildPanelModel({
      cr,
      choices: withCabin,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      extensions: SAMPLE_EXTENSIONS,
    });
    const withExtModel = toBuildPanelModel({
      cr,
      choices: { ...withCabin, extensionIds: ['050'] },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      airPricing: SAMPLE_AIR_PRICING,
      extensions: SAMPLE_EXTENSIONS,
    });
    const parseAmount = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));
    expect(parseAmount(withExtModel.grossTotal)).toBeGreaterThan(
      parseAmount(noExtModel.grossTotal),
    );
  });

  it('adds a VA Air section when air choice is set for guest 1', () => {
    const choices: crChoices = {
      ...withCabin,
      air: {
        G1: {
          includeAirfare: true,
          originGateway: 'JFK',
          returnGateway: 'JFK',
          originClass: 'D', // Business class
          returnClass: 'D',
        },
      },
    };
    const model = toBuildPanelModel({
      cr,
      choices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      airPricing: SAMPLE_AIR_PRICING,
    });
    const sections = model.guests[0]?.sections ?? [];
    const airSection = sections.find((s) => s.kind === 'air');
    expect(airSection).toBeDefined();
    expect(airSection?.lines.some((l) => l.label.includes('VA Air'))).toBe(true);
    // Priced from the payload, not from a per-class constant: JFK business is
    // advertised 5898 / sell 5198, so the discount line is the 700 gap between them.
    expect(airSection?.lines.map((l) => l.amount)).toEqual(['$5,898.00', '$700.00', '$5,198.00']);
  });

  it('prices a one-way selection as ONE leg, not a round trip', () => {
    // The regression this whole slice exists for: an outbound-only guest used to be billed
    // the full round-trip fare here and on the VA Air tab.
    const model = toBuildPanelModel({
      cr,
      choices: {
        ...withCabin,
        air: {
          G1: {
            includeAirfare: true,
            originGateway: 'JFK',
            returnGateway: 'C/O',
            originClass: 'D',
          },
        },
      },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      airPricing: SAMPLE_AIR_PRICING,
    });
    const airSection = (model.guests[0]?.sections ?? []).find((s) => s.kind === 'air');
    expect(airSection?.lines.map((l) => l.amount)).toEqual(['$2,949.00', '$350.00', '$2,599.00']);
    expect(airSection?.lines[0]?.label).toContain('JFK Outbound Only');
  });

  it('omits the air section entirely while fares are still loading', () => {
    // No airPricing means no price. Rendering a $0 air line would read as "air is free".
    const model = toBuildPanelModel({
      cr,
      choices: {
        ...withCabin,
        air: { G1: { includeAirfare: true, originGateway: 'JFK', originClass: 'D' } },
      },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    expect((model.guests[0]?.sections ?? []).find((s) => s.kind === 'air')).toBeUndefined();
  });

  it('includes airfare amounts in the gross total', () => {
    const noAirModel = toBuildPanelModel({
      cr,
      choices: withCabin,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    const withAirModel = toBuildPanelModel({
      cr,
      choices: {
        ...withCabin,
        air: {
          G1: {
            includeAirfare: true,
            originGateway: 'JFK',
            returnGateway: 'JFK',
            originClass: 'Q',
            returnClass: 'Q',
          },
        },
      },
      guests: 1,
      currency: 'USD',
      promoCodes: [],
      airPricing: SAMPLE_AIR_PRICING,
    });
    const parseAmount = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));
    expect(parseAmount(withAirModel.grossTotal)).toBeGreaterThan(
      parseAmount(noAirModel.grossTotal),
    );
  });

  it('omits air section when includeAirfare is false', () => {
    const choices: crChoices = {
      ...withCabin,
      air: {
        G1: { includeAirfare: false },
      },
    };
    const model = toBuildPanelModel({
      cr,
      choices,
      guests: 1,
      currency: 'USD',
      promoCodes: [],
    });
    const sections = model.guests[0]?.sections ?? [];
    expect(sections.find((s) => s.kind === 'air')).toBeUndefined();
  });
});
