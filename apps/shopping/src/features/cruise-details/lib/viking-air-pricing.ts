import type { AirCityPricing, AirGateway } from '@vikings/contracts';
import type {
  VikingAirGuestCardOption,
  VikingAirGuestCardSelection,
} from '@/features/cruise-details/components/viking-air-guest-card';

// Viking Air pricing, derived from the AirCityPricingProvider payload (ADR-0016 § 5).
//
// This replaces `viking-air-fixtures.ts`'s constants. Three things change, and all three were
// wrong against the delivered data rather than merely approximate:
//
//  1. Gateways and classes are read from the cruise's own payload — 189/176/175 voyage-specific
//     gateways, not one shared list of 21 that also offered HOU and MDW, which appear in no
//     payload at all.
//  2. The discount is `advertised - sell` for the selected gateway and class. It ranges
//     400–2400 across the three cruises; the old flat 700 was right for 171 of 1620 rows.
//  3. A leg is priced as a LEG. `AdvertisedDepartureFare + AdvertisedReturnFare ==
//     AdvertisedFare` in 1620/1620 rows, so a Cruise-Only return no longer bills a round trip.

/** Sentinel for a gateway slot where the guest flies cruise-only — no air on that leg. */
export const CRUISE_ONLY = 'C/O';

export interface AirPriceBreakdown {
  /** List price of the selected legs. */
  advertised: number;
  /** `advertised - net`, i.e. the Viking Air discount actually offered on these legs. */
  discount: number;
  /** What the guest pays. */
  net: number;
  /** EVO class name for the priced legs, e.g. `BUSINESS`. */
  className: string;
}

function findGateway(
  pricing: AirCityPricing,
  airportCode: string | undefined,
  airClass: string | undefined,
): AirGateway | undefined {
  if (airportCode === undefined || airClass === undefined) return undefined;
  return pricing.gateways.find((g) => g.airportCode === airportCode && g.airClass === airClass);
}

/** True when a gateway slot means "no air on this leg" rather than naming an airport. */
function isCruiseOnly(gateway: string | undefined): boolean {
  return gateway === CRUISE_ONLY;
}

/**
 * Prices a guest's selection against the cruise's air payload.
 *
 * Returns `undefined` when the selection cannot be priced — incomplete, both legs cruise-only,
 * or naming a (gateway, class) pair the payload does not offer. `undefined` rather than a zero
 * breakdown, because "we cannot price this" and "this costs nothing" must not render the same.
 *
 * Legs are summed independently, which is what makes one-way correct: an outbound-only
 * selection pays `advertisedDeparture`, not the full fare. With both legs on the same gateway
 * and class the two halves add back up to the round-trip total exactly.
 */
export function priceSelection(
  pricing: AirCityPricing,
  selection: VikingAirGuestCardSelection,
): AirPriceBreakdown | undefined {
  const { originGateway, returnGateway, originClass, returnClass } = selection;
  if (originGateway === undefined || returnGateway === undefined) return undefined;
  if (isCruiseOnly(originGateway) && isCruiseOnly(returnGateway)) return undefined;

  let advertised = 0;
  let net = 0;
  let className: string | undefined;

  if (!isCruiseOnly(originGateway)) {
    const outbound = findGateway(pricing, originGateway, originClass);
    if (outbound === undefined) return undefined;
    advertised += outbound.regular.advertisedDeparture;
    net += outbound.regular.sellDeparture;
    className = outbound.airClassName;
  }

  if (!isCruiseOnly(returnGateway)) {
    const inbound = findGateway(pricing, returnGateway, returnClass);
    if (inbound === undefined) return undefined;
    advertised += inbound.regular.advertisedReturn;
    net += inbound.regular.sellReturn;
    // The outbound class wins when both legs are priced; they are the same in every selection
    // the UI can produce, since one class control drives each leg.
    className ??= inbound.airClassName;
  }

  if (className === undefined) return undefined;
  return { advertised, discount: advertised - net, net, className };
}

/**
 * Gateway options for the dropdown, Cruise Only first (node 2222:437447).
 *
 * Deduplicated because the payload carries one row per (gateway, class) — 567 rows for 189
 * gateways on HID.
 *
 * The label carries the airport NAME, not just the code, because this feeds a searchable
 * combobox: an agent types "Boston", and with bare codes that matches nothing. A code with no
 * table entry still degrades to the code alone rather than being dropped (ADR-0016 § 10).
 */
export function toGatewayOptions(pricing: AirCityPricing): VikingAirGuestCardOption[] {
  const byCode = new Map<string, string>();
  for (const gateway of pricing.gateways) {
    if (byCode.has(gateway.airportCode)) continue;
    byCode.set(
      gateway.airportCode,
      gateway.airportName === undefined
        ? gateway.airportCode
        : `${gateway.airportName} - ${gateway.airportCode}`,
    );
  }

  return [
    { value: CRUISE_ONLY, label: 'Cruise Only' },
    ...[...byCode.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label })),
  ];
}

/**
 * Cabin-class display order: Economy, Premium Economy, Business (node 2222:437467).
 *
 * Cheapest first, as the approved frames show — NOT alphabetical by code, which is what
 * sorting on `airClass` produced and which put Business at the top.
 */
const CLASS_ORDER: Readonly<Record<string, number>> = { Q: 0, P: 1, D: 2 };

/** EVO's class code for Economy — the default class for a new selection. */
export const ECONOMY_CLASS = 'Q';

/**
 * Class options for the dropdown, e.g. `Economy - Q` (node 2222:437467).
 *
 * Derived from the payload rather than hardcoded, so a cruise offering only two classes
 * cannot show three. Title-cased because EVO sends SCREAMING names and the frames show
 * sentence case. An unknown class code sorts last rather than being dropped.
 */
export function toClassOptions(pricing: AirCityPricing): VikingAirGuestCardOption[] {
  const byCode = new Map<string, string>();
  for (const gateway of pricing.gateways) {
    if (!byCode.has(gateway.airClass)) byCode.set(gateway.airClass, gateway.airClassName);
  }

  return [...byCode.entries()]
    .sort(([a], [b]) => (CLASS_ORDER[a] ?? 99) - (CLASS_ORDER[b] ?? 99) || a.localeCompare(b))
    .map(([value, name]) => ({ value, label: `${toTitleCase(name)} - ${value}` }));
}

/** `PREMIUM ECONOMY` -> `Premium Economy`. */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => (word === '' ? word : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`))
    .join(' ');
}
