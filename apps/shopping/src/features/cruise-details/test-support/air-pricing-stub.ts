import type { AirCityPricing, AirCityPricingProvider } from '@vikings/contracts';

// Test-only stub for the `AirCityPricingProvider` port.
//
// Feature tests depend on the PORT, never on `@vikings/adapters` — the same rule the
// production code follows (invariant 1). The real mock adapter is exercised by its own
// conformance suite in `packages/adapters`; what these tests need is a small, readable
// payload whose numbers a reader can check by eye.
//
// The fares below are real `HID270322T` rows, so a test asserting "$5,198" is asserting
// against something Viking actually sent rather than against a number invented here.

function fare(advertisedTotal: number, sellTotal: number) {
  return {
    direction: 'RT',
    advertisedTotal,
    advertisedDeparture: advertisedTotal / 2,
    advertisedReturn: advertisedTotal / 2,
    sellTotal,
    sellDeparture: sellTotal / 2,
    sellReturn: sellTotal / 2,
  };
}

/** Two gateways × two classes, with DIFFERENT discounts — 700 for JFK, 600 for BOS. */
export const SAMPLE_AIR_PRICING: AirCityPricing = {
  cruiseId: 'TEST',
  currency: 'USD',
  rateCode: '',
  categories: [
    { code: '01', abbrev: 'ES' },
    { code: '02', abbrev: 'DV' },
  ],
  gateways: [
    {
      airportCode: 'JFK',
      airportName: 'New York John F. Kennedy International Airport',
      airClass: 'D',
      airClassName: 'BUSINESS',
      regular: fare(5898, 5198),
    },
    {
      airportCode: 'JFK',
      airportName: 'New York John F. Kennedy International Airport',
      airClass: 'Q',
      airClassName: 'ECONOMY',
      regular: fare(1798, 1098),
    },
    {
      airportCode: 'BOS',
      airportName: 'Boston Logan International Airport',
      airClass: 'D',
      airClassName: 'BUSINESS',
      regular: fare(5898, 5298),
    },
  ],
};

/**
 * A provider stub.
 *
 * Returns `ok` with {@link SAMPLE_AIR_PRICING} by default; pass `'empty'` for a sailing with
 * no air offering, or an `AirCityPricing` to shape the fares a test needs.
 */
export function stubAirProvider(
  pricing: AirCityPricing | 'empty' = SAMPLE_AIR_PRICING,
): AirCityPricingProvider {
  return {
    getAirCityPricing: () =>
      Promise.resolve(pricing === 'empty' ? { status: 'empty' } : { status: 'ok', pricing }),
  };
}
