import type { CruiseExtensions, CruiseExtensionsProvider } from '@vikings/contracts';

// Test-only stub for the `CruiseExtensionsProvider` port.
//
// Feature tests depend on the PORT, never on `@vikings/adapters` (invariant 1). The rows below
// mirror the shape of HID270322T's delivered payload — a bundled land package with two hotel
// legs, plus two optional extensions — with round numbers so an assertion reads by eye.

const HOTEL = { code: 'CDGHTL', name: 'Paris Hotel', city: 'Paris', portCode: 'PAR' };

export const SAMPLE_EXTENSIONS: CruiseExtensions = {
  cruiseId: 'HID270322T',
  currency: 'USD',
  landPackage: {
    code: '060',
    title: 'Paris to the Swiss Alps',
    category: 'land-package',
    nights: 4,
    fromDate: '2027-03-20T00:00:00',
    toDate: '2027-03-22T00:00:00',
    currency: 'USD',
    doublePrice: 1300,
    soldOut: false,
    includedInFare: true,
    restrictedByClass: false,
    hotType: 'PR',
    multi: 'M',
    stays: [
      {
        code: '061',
        title: 'Zurich Hotel',
        category: 'pre',
        nights: 2,
        fromDate: '2027-03-20T00:00:00',
        toDate: '2027-03-22T00:00:00',
        hotel: { code: 'ZRHHTL', name: 'Zurich Hotel', city: 'Zurich', portCode: 'ZRH' },
      },
      {
        code: '062',
        title: 'Paris Hotel',
        category: 'post',
        nights: 2,
        fromDate: '2027-03-29T00:00:00',
        toDate: '2027-03-31T00:00:00',
        hotel: HOTEL,
      },
    ],
    descriptionBullets: [],
  },
  extensions: [
    {
      code: '050',
      title: 'Milan Extension',
      category: 'pre',
      nights: 3,
      fromDate: '2027-03-17T00:00:00',
      toDate: '2027-03-20T00:00:00',
      currency: 'USD',
      doublePrice: 1500,
      singlePrice: 3000,
      remainingCount: 15,
      soldOut: false,
      includedInFare: false,
      restrictedByClass: false,
      hotType: 'PR',
      multi: 'N',
      stays: [
        {
          code: '050',
          title: 'Milan Extension',
          category: 'pre',
          nights: 3,
          fromDate: '2027-03-17T00:00:00',
          toDate: '2027-03-20T00:00:00',
          hotel: { code: 'MILHTL', name: 'Milan Hotel', city: 'Milan', portCode: 'MIL' },
        },
      ],
      descriptionBullets: [],
    },
    {
      code: '070',
      title: 'Paris Extension',
      category: 'post',
      nights: 2,
      fromDate: '2027-03-31T00:00:00',
      toDate: '2027-04-02T00:00:00',
      currency: 'USD',
      doublePrice: 900,
      singlePrice: 1800,
      remainingCount: 52,
      soldOut: false,
      includedInFare: false,
      restrictedByClass: false,
      hotType: 'PO',
      multi: 'N',
      stays: [
        {
          code: '070',
          title: 'Paris Extension',
          category: 'post',
          nights: 2,
          fromDate: '2027-03-31T00:00:00',
          toDate: '2027-04-02T00:00:00',
          hotel: HOTEL,
        },
      ],
      descriptionBullets: [],
    },
  ],
};

export type ExtensionsStubOutcome =
  | { kind: 'ok'; offering: CruiseExtensions }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

/**
 * A provider stub. Tagged union rather than `CruiseExtensions | { error }`, because the
 * curated types are `looseObject`s and carry an index signature that defeats `in` narrowing.
 */
export function stubExtensionsProvider(
  outcome: ExtensionsStubOutcome = { kind: 'ok', offering: SAMPLE_EXTENSIONS },
): CruiseExtensionsProvider {
  return {
    getExtensions: () => {
      if (outcome.kind === 'empty') return Promise.resolve({ status: 'empty' as const });
      if (outcome.kind === 'error') {
        return Promise.resolve({
          status: 'error' as const,
          kind: 'upstream' as const,
          message: outcome.message,
        });
      }
      return Promise.resolve({ status: 'ok' as const, offering: outcome.offering });
    },
  };
}
