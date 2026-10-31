import type {
  AirCityPricing,
  CategoryPricingAvailability,
  CruiseExtensions,
} from '@vikings/contracts';
import { formatDateWithWeekday } from '@vikings/ui/lib/date-format';
import { isCruiseTour, nightsLabel } from '@/features/cruise-details/lib/cruise-header-model.ts';
import { hotelSideLabel } from '@/features/cruise-details/lib/extensions-view-model.ts';
import { PROTOTYPE_GUESTS } from '@/features/cruise-details/lib/viking-air-fixtures.ts';
import {
  CRUISE_ONLY,
  priceSelection,
  toTitleCase,
} from '@/features/cruise-details/lib/viking-air-pricing.ts';
import type { CruiseChoices } from '@/store/cruise-workspace.store.ts';
import type {
  BuildPanelExpandedProps,
  BuildPanelGuest,
  BuildPanelPriceLine,
  BuildPanelSection,
} from '../components/expanded/index.ts';

/*
  Pure model transforms for the Build Panel (VCX-10335).

  Prototype-only: no live rates, no EVO/CRM calls. Everything here is illustrative; the
  real adapter layer replaces these formulae without touching any UI component.

  Design decisions:
  - Guest names come from PROTOTYPE_GUESTS (same fixture the Viking Air tab uses).
  - Cruise fare is the held stateroom category's doublePrice per person. With no cabin held,
    the whole panel prices at zero (VCX-10332: no cabin is pre-selected). There is no
    "default" category to fall back on: EVO orders categories price-descending, so the old
    `categories[0]` fallback quoted the sailing's most expensive cabin.
  - Hotel extensions are billed as soon as they are chosen, cabin or not: an extension has its
    own price, independent of the stateroom. Air and TPP wait for a held cabin. Either way the
    breakdown adds up to the total it sits under.
  - Extension sections come from choices.extensionIds (store) matched by EVO invcode against
    the CruiseExtensionsProvider offering passed in as `extensions`.
  - Air sections come from choices.air (store) priced against the AirCityPricingProvider
    payload passed in as `airPricing` — the same data and the same `priceSelection` the
    Viking Air tab uses, so the two cannot disagree.
  - Each guest column has at most four groups, in this order: cruise fare (+ discounts),
    hotel extensions, Viking Air, TPP. Every selected extension is a line in ONE hotel group
    under one subtotal; TPP appears only when the guest's checkbox is ticked.
  - TPP price is a fixed mock amount (see TPP_PRICE_USD), matching the Figma annotation.
  - Guest 0 (primary PAX) is TPP-eligible; all others are ineligible (Non US Resident).
*/

/** Travel Protection Plan per-guest price in USD (mock, per Figma annotation). */
export const TPP_PRICE_USD = 749;

/**
 * Mock guest full names for the prototype — index 0 maps to Guest 1, etc.
 * @deprecated Use PROTOTYPE_GUESTS[i].name directly. Kept for back-compat with existing tests.
 */
export const MOCK_GUEST_NAMES = PROTOTYPE_GUESTS.map((g) => g.name);

export interface BuildPanelModelInput {
  cruise: CategoryPricingAvailability;
  choices: CruiseChoices;
  guests: number;
  currency: string;
  promoCodes: readonly string[];
  /**
   * The cruise's air fares, from `AirCityPricingProvider`.
   *
   * Passed in rather than stored alongside the choices, because the workspace store records
   * what the agent PICKED and never what something costs. The panel and the Viking Air tab
   * therefore price the same selection through the same `priceSelection`, from the same
   * React Query cache entry — which is what stops the footer total and the tab disagreeing.
   *
   * `undefined` while the fares are still loading, or when the sailing has no air offering.
   */
  airPricing?: AirCityPricing | undefined;
  /**
   * The cruise's extension offering, from `CruiseExtensionsProvider`.
   *
   * Passed in for the same reason `airPricing` is: the store records which extensions the
   * agent PICKED, never what they cost. The tab and the panel read one React Query entry, so
   * a card and the footer cannot disagree.
   */
  extensions?: CruiseExtensions | undefined;
}

/** Returns "Guest 1", "Guest 2", etc. for zero-based index i. */
export function toGuestLabel(i: number): string {
  return `Guest ${i + 1}`;
}

function formatCurrencyAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}

/**
 * The per-person fare of the held stateroom's category, or `undefined` when there is nothing
 * to price — no cabin held yet, or a held category the sailing no longer offers.
 */
function resolvePerPersonFare(
  cruise: CategoryPricingAvailability,
  choices: CruiseChoices,
  guests: number,
): number | undefined {
  const abbrev = choices.stateroom?.categoryAbbrev;
  if (abbrev === undefined) return undefined;
  const category = cruise.categories.find((c) => c.abbrev === abbrev);
  if (category === undefined) return undefined;
  // Solo traveller cannot take the double-occupancy fare (matches pricing.ts rule).
  return guests <= 1 ? category.singlePrice : category.doublePrice;
}

/** The Build Panel's view model: the expanded drawer's props plus whether anything is priced. */
export type BuildPanelModel = BuildPanelExpandedProps & {
  /** False until anything is billed (a held cabin, or an extension); the bar shows `zero`. */
  isPriced: boolean;
};

interface GuestColumnResult {
  column: BuildPanelGuest;
  /** Raw numeric total for this guest, used to sum the gross total without re-parsing. */
  totalAmount: number;
}

/** Formats the gateway portion of the airfare label for one-way and round-trip selections. */
function formatGatewayPart(origin: string | undefined, ret: string | undefined): string {
  if (origin === undefined || ret === undefined) return origin ?? ret ?? '';
  if (origin === CRUISE_ONLY) return `${ret} Return Only`;
  if (ret === CRUISE_ONLY) return `${origin} Outbound Only`;
  return origin === ret ? `${origin} Roundtrip` : `${origin} Outbound – ${ret} Return`;
}

/**
 * Builds the air section for a guest, or undefined when air is not selected/applicable.
 *
 * Prices through the shared `priceSelection`, so an outbound-only selection is billed as one
 * leg here exactly as it is on the Viking Air tab. This used to recompute from
 * `AIRFARE_BY_CLASS` minus a flat discount, which both over-billed one-way selections and
 * disagreed with the delivered fares for most gateways.
 */
function buildAirSection(
  choices: CruiseChoices,
  guestId: string,
  currency: string,
  airPricing: AirCityPricing | undefined,
): { section: BuildPanelSection; amount: number } | undefined {
  const airChoice = choices.air[guestId];
  if (!airChoice?.includeAirfare || airPricing === undefined) return undefined;

  const priced = priceSelection(airPricing, airChoice);
  if (priced === undefined) return undefined;

  // 'BUSINESS' + 'D' → 'Business D', matching the frames' sentence case.
  const classCode =
    airChoice.originGateway !== CRUISE_ONLY ? airChoice.originClass : airChoice.returnClass;
  const classLabel = `${toTitleCase(priced.className)}${classCode === undefined ? '' : ` ${classCode}`}`;

  const gatewayPart = formatGatewayPart(airChoice.originGateway, airChoice.returnGateway);

  const airLabel = gatewayPart
    ? `Viking Air (${gatewayPart}) (${classLabel})`
    : `Viking Air (${classLabel})`;

  return {
    section: {
      kind: 'air',
      lines: [
        {
          variant: 'list',
          label: airLabel,
          amount: formatCurrencyAmount(priced.advertised, currency),
        },
        {
          variant: 'discount',
          label: 'Group Discount',
          amount: formatCurrencyAmount(priced.discount, currency),
        },
        {
          variant: 'subtotal',
          label: 'Viking Air Subtotal',
          amount: formatCurrencyAmount(priced.net, currency),
        },
      ],
    },
    amount: priced.net,
  };
}

/**
 * Builds the hotel-extensions section for a guest (all guests share the same extensions):
 * one list line per selected extension under a single "Hotel Extensions Subtotal", or
 * undefined when nothing priceable is selected.
 *
 * Matched by EVO's `invcode`, not by array position. The previous code indexed into a sorted
 * fixture with a stored number, so reordering the list silently re-priced every selection —
 * and it recovered the amount by running a regex over a formatted string, which the curated
 * contract makes unnecessary because the price is a number.
 */
function buildExtensionSection(
  choices: CruiseChoices,
  currency: string,
  offering: CruiseExtensions | undefined,
): { section: BuildPanelSection; amount: number } | undefined {
  if (choices.extensionIds.length === 0 || offering === undefined) return undefined;

  const byCode = new Map(offering.extensions.map((ext) => [ext.code, ext]));
  let amount = 0;
  const lines: BuildPanelPriceLine[] = [];

  for (const code of choices.extensionIds) {
    const ext = byCode.get(code);
    // A selection with no price is skipped rather than billed at 0: an extension EVO prices
    // through its parent has no standalone amount to charge.
    if (ext === undefined || ext.doublePrice === undefined) continue;

    amount += ext.doublePrice;
    // "Milan Extension - (PRE HOTEL)": the agent reads which side of the sailing each stay
    // falls on straight off the breakdown, as the approved Build Panel frames show.
    const side = hotelSideLabel(ext.category);
    lines.push({
      variant: 'list',
      label: side === undefined ? ext.title : `${ext.title} - (${side})`,
      amount: formatCurrencyAmount(ext.doublePrice, currency),
    });
  }

  if (lines.length === 0) return undefined;
  lines.push({
    variant: 'subtotal',
    label: 'Hotel Extensions Subtotal',
    amount: formatCurrencyAmount(amount, currency),
  });
  return { section: { kind: 'hotel', lines }, amount };
}

/** The TPP section — a single line with no subtotal, since the plan is its own subtotal. */
function buildProtectionSection(currency: string): BuildPanelSection {
  return {
    kind: 'protection',
    lines: [
      {
        variant: 'list',
        label: 'Travel Protection Plan',
        amount: formatCurrencyAmount(TPP_PRICE_USD, currency),
      },
    ],
  };
}

function buildGuestColumn(
  guestIndex: number,
  choices: CruiseChoices,
  perPersonFare: number | undefined,
  currency: string,
  airPricing: AirCityPricing | undefined,
  extensions: CruiseExtensions | undefined,
  fareLabel: string,
): GuestColumnResult {
  const guestKey = `guest-${guestIndex}`;
  const label = toGuestLabel(guestIndex);
  const protoGuest = PROTOTYPE_GUESTS[guestIndex];
  const name = protoGuest?.name ?? label;
  // Guest IDs match PROTOTYPE_GUESTS: 'G1', 'G2'. Used as keys in choices.air.
  const guestId = protoGuest?.id ?? `G${guestIndex + 1}`;
  const tppIncluded = choices.travelProtection[guestKey] ?? false;

  // Guest 0 is the primary guest and is modelled as US-eligible for TPP.
  // All subsequent guests are ineligible (Non US Resident) — demonstrates both UI paths.
  const tpp: BuildPanelGuest['tpp'] =
    guestIndex === 0
      ? {
          eligible: true,
          included: tppIncluded,
          amount: formatCurrencyAmount(TPP_PRICE_USD, currency),
        }
      : { eligible: false, reason: 'Non US Resident' };

  const isPriced = perPersonFare !== undefined;
  const fare = perPersonFare ?? 0;
  const fareFormatted = formatCurrencyAmount(fare, currency);
  const tppAmount = isPriced && guestIndex === 0 && tppIncluded ? TPP_PRICE_USD : 0;

  const extResult = buildExtensionSection(choices, currency, extensions);
  const airResult = isPriced ? buildAirSection(choices, guestId, currency, airPricing) : undefined;

  const sections: BuildPanelSection[] = [
    {
      kind: 'cruise',
      lines: [
        { variant: 'list', label: fareLabel, amount: fareFormatted },
        { variant: 'subtotal', label: 'Cruise Subtotal', amount: fareFormatted },
      ],
    },
    ...(extResult !== undefined ? [extResult.section] : []),
    ...(airResult !== undefined ? [airResult.section] : []),
    ...(tppAmount > 0 ? [buildProtectionSection(currency)] : []),
  ];

  // Accumulate raw numbers — never parse formatted strings back to a number, as that
  // silently drops a leading minus on negative amounts.
  const totalAmount = fare + tppAmount + (extResult?.amount ?? 0) + (airResult?.amount ?? 0);

  return {
    column: {
      label,
      name,
      tpp,
      sections,
      totalLabel: `${label} Total`,
      total: formatCurrencyAmount(totalAmount, currency),
    },
    totalAmount,
  };
}

/**
 * Derives the `BuildPanelExpandedProps` from live cruise data and workspace choices.
 *
 * This is the single derivation point for the Build Panel UI — keep derivation logic here
 * and away from React components, so it is directly testable and replaceable.
 */
export function toBuildPanelModel(input: BuildPanelModelInput): BuildPanelModel {
  const { cruise, choices, guests, currency, promoCodes, airPricing, extensions } = input;
  const guestCount = Math.max(1, guests);

  const perPersonFare = resolvePerPersonFare(cruise, choices, guestCount);
  // A cruise tour's fare covers the sailing and its land stays, so it is named for both.
  const fareLabel = isCruiseTour(cruise) ? 'Cruise Tour Fare' : 'Cruise Fare';
  const guestResults = Array.from({ length: guestCount }, (_, i) =>
    buildGuestColumn(i, choices, perPersonFare, currency, airPricing, extensions, fareLabel),
  );
  const guestColumns = guestResults.map((r) => r.column);
  const grossTotalAmount = guestResults.reduce((sum, r) => sum + r.totalAmount, 0);

  const details: string[] = [
    cruise.shipName.toUpperCase(),
    cruise.cruiseId,
    nightsLabel(cruise.nights, cruise.totalNights),
  ];
  if (choices.stateroom !== undefined) {
    details.push(
      `Cat. ${choices.stateroom.categoryAbbrev} · Cabin ${choices.stateroom.cabinNumber}`,
    );
  }

  const base = {
    title: cruise.cruiseName,
    startDate: formatDateWithWeekday(cruise.sailingDateFrom),
    endDate: formatDateWithWeekday(cruise.sailingDateTo),
    details,
    guests: guestColumns,
    // Symbol-only: PriceCurrency draws the currency code beside the figure, so a
    // code-suffixed string ("$1.00 USD") would show the code twice.
    grossTotal: formatCurrencyAmount(grossTotalAmount, currency),
    currencyCode: currency,
    // Anything billed takes the footer out of its zero state — a held cabin, or an extension
    // chosen before one.
    isPriced: perPersonFare !== undefined || grossTotalAmount > 0,
  };
  // VCX-10484 R6: the badge names the promo that priced the cruise. The search can find a promo
  // by part of its code, so the typed code is only the fallback, for the adapters that do not
  // say which promo applied.
  const promoCode = cruise.appliedPromoCode ?? promoCodes[0]?.trim();
  return promoCode !== undefined && promoCode !== '' ? { ...base, promoCode } : base;
}
