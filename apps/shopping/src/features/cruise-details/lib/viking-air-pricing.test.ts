import type { AirCityPricing, AirGateway } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import {
  CRUISE_ONLY,
  priceSelection,
  toClassOptions,
  toGatewayOptions,
} from './viking-air-pricing.ts';

// The pricing model that replaces AIRFARE_BY_CLASS / AIRFARE_DISCOUNT.
//
// The numbers below are real rows from HID270322T's delivered payload, so these assertions
// fail if the mapping drifts from the data rather than merely from a previous guess.

function gateway(code: string, cls: string, advertised: number, sell: number, name?: string) {
  return {
    airportCode: code,
    ...(name !== undefined && { airportName: name }),
    airClass: cls,
    airClassName: cls === 'D' ? 'BUSINESS' : cls === 'P' ? 'PREMIUM ECONOMY' : 'ECONOMY',
    regular: {
      direction: 'RT',
      advertisedTotal: advertised,
      advertisedDeparture: advertised / 2,
      advertisedReturn: advertised / 2,
      sellTotal: sell,
      sellDeparture: sell / 2,
      sellReturn: sell / 2,
    },
  };
}

const pricing: AirCityPricing = {
  cruiseId: 'HID270322T',
  currency: 'USD',
  rateCode: '',
  categories: [{ code: '01', abbrev: 'ES' }],
  gateways: [
    // ABE business: advertised 5898, sell 5198 -> discount 700.
    gateway('ABE', 'D', 5898, 5198),
    // ABE premium economy: advertised 2998, sell 2298 -> discount 700.
    gateway('ABE', 'P', 2998, 2298),
    // JFK business with a different discount (600), which is the common case in the payload.
    gateway('JFK', 'D', 5898, 5298, 'New York John F. Kennedy International Airport'),
  ],
};

describe('priceSelection — round trip', () => {
  it('sums both legs back to the full fare', () => {
    const priced = priceSelection(pricing, {
      originGateway: 'ABE',
      returnGateway: 'ABE',
      originClass: 'D',
      returnClass: 'D',
    });
    expect(priced).toEqual({ advertised: 5898, discount: 700, net: 5198, className: 'BUSINESS' });
  });

  it('uses the gateway+class discount, not a constant', () => {
    // Same class, same advertised fare, different gateway -> different discount. The old
    // model returned 700 for both because the discount was a module constant.
    const abe = priceSelection(pricing, {
      originGateway: 'ABE',
      returnGateway: 'ABE',
      originClass: 'D',
      returnClass: 'D',
    });
    const jfk = priceSelection(pricing, {
      originGateway: 'JFK',
      returnGateway: 'JFK',
      originClass: 'D',
      returnClass: 'D',
    });
    expect(abe?.discount).toBe(700);
    expect(jfk?.discount).toBe(600);
  });
});

describe('priceSelection — one way (the VCX-10335 bug)', () => {
  it('charges only the outbound leg when the return is Cruise Only', () => {
    const priced = priceSelection(pricing, {
      originGateway: 'ABE',
      returnGateway: CRUISE_ONLY,
      originClass: 'D',
    });
    // Previously this billed the full 5198 round trip.
    expect(priced).toEqual({ advertised: 2949, discount: 350, net: 2599, className: 'BUSINESS' });
  });

  it('charges only the return leg when the outbound is Cruise Only', () => {
    const priced = priceSelection(pricing, {
      originGateway: CRUISE_ONLY,
      returnGateway: 'ABE',
      returnClass: 'D',
    });
    expect(priced?.net).toBe(2599);
  });

  it('is exactly half the round trip for the same gateway and class', () => {
    const round = priceSelection(pricing, {
      originGateway: 'ABE',
      returnGateway: 'ABE',
      originClass: 'D',
      returnClass: 'D',
    });
    const oneWay = priceSelection(pricing, {
      originGateway: 'ABE',
      returnGateway: CRUISE_ONLY,
      originClass: 'D',
    });
    expect(oneWay?.net).toBe((round?.net ?? 0) / 2);
  });
});

describe('priceSelection — unpriceable selections', () => {
  it('returns undefined when both legs are Cruise Only', () => {
    expect(
      priceSelection(pricing, { originGateway: CRUISE_ONLY, returnGateway: CRUISE_ONLY }),
    ).toBeUndefined();
  });

  it('returns undefined when the selection is incomplete', () => {
    expect(priceSelection(pricing, { originGateway: 'ABE' })).toBeUndefined();
  });

  it('returns undefined for a gateway/class pair the payload does not offer', () => {
    // JFK has no premium-economy row here. Returning undefined rather than 0 is what stops
    // an unavailable combination rendering as a free flight.
    expect(
      priceSelection(pricing, {
        originGateway: 'JFK',
        returnGateway: 'JFK',
        originClass: 'P',
        returnClass: 'P',
      }),
    ).toBeUndefined();
  });
});

describe('option builders', () => {
  it('lists Cruise Only first, then each gateway once', () => {
    const options = toGatewayOptions(pricing);
    expect(options[0]).toEqual({ value: CRUISE_ONLY, label: 'Cruise Only' });
    expect(options.slice(1).map((o) => o.value)).toEqual(['ABE', 'JFK']);
  });

  it('labels a gateway with its airport name, so the combobox is searchable', () => {
    // This is the point of the names: the control is a searchable combobox, and typing
    // "Kennedy" against a list of bare codes matches nothing.
    const options = toGatewayOptions(pricing);
    expect(options.find((o) => o.value === 'JFK')?.label).toBe(
      'New York John F. Kennedy International Airport - JFK',
    );
  });

  it('falls back to the bare code for a gateway the table does not cover', () => {
    const unnamed: AirCityPricing = {
      ...pricing,
      gateways: [{ ...(pricing.gateways[0] as AirGateway), airportCode: 'ZZZ' }].map(
        ({ airportName: _drop, ...rest }) => rest,
      ),
    };
    expect(toGatewayOptions(unnamed).find((o) => o.value === 'ZZZ')?.label).toBe('ZZZ');
  });

  it('derives class options from the payload, title-cased, CHEAPEST FIRST', () => {
    // Economy, Premium Economy, Business — the frames' order. Sorting on the class code put
    // Business at the top, which read as a deliberate upsell it is not.
    expect(toClassOptions(pricing)).toEqual([
      { value: 'P', label: 'Premium Economy - P' },
      { value: 'D', label: 'Business - D' },
    ]);
  });

  it('cannot offer a class the cruise does not sell', () => {
    // The old CLASS_OPTIONS always showed all three.
    expect(toClassOptions(pricing).map((o) => o.value)).not.toContain('Q');
  });
});
