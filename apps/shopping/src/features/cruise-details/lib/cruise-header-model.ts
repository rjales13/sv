import type { CategoryPricingAvailability, LandPackageStop } from '@vikings/contracts';
import { formatDateWithWeekday } from '@vikings/ui/lib/date-format';
import type { CardHeaderCategory } from '@/shared/components/card-header/index.ts';
import type {
  CruiseContextCardProps,
  CruiseContextItineraryItem,
} from '../components/context-card/context-card.tsx';

// Presentation rules for the cruise-details context header, kept as pure functions so the
// header component stays a layout concern and these formats are directly testable against
// the approved frames.

/**
 * EVO's singular `Brand` -> the plural tag the frames show ("River" -> "Rivers").
 *
 * An unmapped brand passes through unchanged rather than being pluralised blindly: a new
 * product family should read oddly in one tag, not be silently mislabelled.
 */
const BRAND_LABELS: Readonly<Record<string, string>> = {
  River: 'Rivers',
  Ocean: 'Oceans',
  Mississippi: 'Mississippi',
};

export function brandLabel(brand: string | undefined): string | undefined {
  if (brand === undefined) return undefined;
  return BRAND_LABELS[brand] ?? brand;
}

/** Above this the frames stop counting and show "9+". */
const REMAINING_DISPLAY_CAP = 9;

/**
 * Berths remaining, as the header words it.
 *
 * Capped because an exact large number ("113 remaining") reads as inventory data the agent
 * might quote; the frames deliberately blur it to a reassurance.
 */
export function remainingLabel(availableToSell: number | undefined): string | undefined {
  // Unknown is not zero. A missing count renders nothing at all rather than claiming the
  // sailing is sold out.
  if (availableToSell === undefined) return undefined;
  if (availableToSell <= 0) return 'Sold out';
  const count =
    availableToSell > REMAINING_DISPLAY_CAP ? `${REMAINING_DISPLAY_CAP}+` : `${availableToSell}`;
  return `${count} remaining`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The nights Tag: "7 Cruise Nights / 11 Total Nights" (ShoppingApp_UX-VD 1043:176419).
 *
 * The total is shown only when the package runs longer than the sailing — EVO's `Duration`
 * exceeds `days` exactly when land nights are sold around the cruise (`crTourFlag` 'Y').
 * Equal or unknown, "14 Cruise Nights / 14 Total Nights" would only repeat itself, and an
 * unknown total must not be printed as if it matched.
 */
export function nightsLabel(nights: number, totalNights: number | undefined): string {
  const cruise = plural(nights, 'Cruise Night');
  if (totalNights === undefined || totalNights <= nights) return cruise;
  return `${cruise} / ${plural(totalNights, 'Total Night')}`;
}

/**
 * Whether the sailing is a cruise tour — sold with land stays around it (EVO `crTourFlag` 'Y').
 *
 * Either signal counts: the land package EVO names, or total nights beyond the sailing. The
 * second is what makes the header say "7 Cruise Nights / 11 Total Nights", so accepting it too
 * keeps every screen agreeing on what a package is even when a payload omits the package ports.
 */
export function isCruiseTour(cruise: CategoryPricingAvailability): boolean {
  return cruise.landPackage !== undefined || (cruise.totalNights ?? 0) > cruise.nights;
}

/** Everything the context header renders, derived in one place. */
export interface CruiseHeaderModel {
  /** Absent when the wire carried no brand — the header then shows no tag. */
  brandTag: string | undefined;
  cruiseName: string;
  shipName: string;
  cruiseId: string;
  route: string;
  nightsLabel: string;
  embark: string;
  debark: string;
  remaining: string | undefined;
}

export function toCruiseHeaderModel(cruise: CategoryPricingAvailability): CruiseHeaderModel {
  const { itinerary } = cruise;
  return {
    brandTag: brandLabel(cruise.brand),
    cruiseName: cruise.cruiseName,
    shipName: cruise.shipName,
    cruiseId: cruise.cruiseId,
    route: `${tripRoute(cruise).from} → ${tripRoute(cruise).to}`,
    nightsLabel: nightsLabel(cruise.nights, cruise.totalNights),
    embark: `${formatDateWithWeekday(cruise.sailingDateFrom)} ${itinerary.fromPortCode} · ${itinerary.fromPort}`,
    debark: `${formatDateWithWeekday(cruise.sailingDateTo)} ${itinerary.toPortCode} · ${itinerary.toPort}`,
    remaining: remainingLabel(cruise.availableToSell),
  };
}

/** The footer's money format: `$33,455.00 USD`, as the frames render it. */
export function formatMoney(amount: number, currency: string): string {
  const figure = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
  return `${figure} ${currency}`;
}

const BRAND_TO_CATEGORY: Record<string, CardHeaderCategory> = {
  River: 'rivers',
  Ocean: 'oceans',
  Expedition: 'expeditions',
  Mississippi: 'mississippi',
};

function brandToCategory(brand: string | undefined): CardHeaderCategory {
  if (brand !== undefined && brand in BRAND_TO_CATEGORY) {
    return BRAND_TO_CATEGORY[brand] as CardHeaderCategory;
  }
  return 'oceans';
}

const LOW_INVENTORY_THRESHOLD = 9;

/**
 * Where the TRIP starts and ends — the route line on the results card and the details header.
 *
 * For a cruise tour that is the land package's first and last hotel city (HID270322T: Zurich
 * -> Paris), not the sailing's ports (Basel -> Trier): every other figure beside it — "11 Total
 * Nights", the hotel stops — already describes the whole trip. A side with no hotel beyond it
 * keeps its sailing port, and a plain cruise is just its sailing.
 */
export function tripRoute(cruise: CategoryPricingAvailability): { from: string; to: string } {
  return {
    from: cruise.landPackage?.start?.portName ?? cruise.itinerary.fromPort,
    to: cruise.landPackage?.end?.portName ?? cruise.itinerary.toPort,
  };
}

/**
 * The brief itinerary the results card and the details header both show: embark and debark,
 * wrapped by the land package's first and last hotel when the sailing is a cruise tour —
 * e.g. hotel in Zurich, embark Basel, debark Amsterdam, hotel in Paris.
 *
 * One function for both screens, so a cruise tour cannot show its hotels in one place and
 * hide them in the other. The full day-by-day list lives in the Itinerary tab.
 */
export function toItinerarySummary(
  cruise: CategoryPricingAvailability,
): CruiseContextItineraryItem[] {
  const { start, end } = cruise.landPackage ?? {};
  const hotel = (stop: LandPackageStop): CruiseContextItineraryItem => ({
    variant: 'hotel',
    date: formatDateWithWeekday(stop.date),
    cityCode: stop.portCode,
    cityName: stop.portName,
  });

  return [
    ...(start ? [hotel(start)] : []),
    {
      variant: 'departure',
      date: formatDateWithWeekday(cruise.sailingDateFrom),
      cityCode: cruise.itinerary.fromPortCode,
      cityName: cruise.itinerary.fromPort,
    },
    {
      variant: 'arrival',
      date: formatDateWithWeekday(cruise.sailingDateTo),
      cityCode: cruise.itinerary.toPortCode,
      cityName: cruise.itinerary.toPort,
    },
    ...(end ? [hotel(end)] : []),
  ];
}

/** Maps a curated cruise record to the CruiseContextCard props for the details shell. */
export function toCruiseContextCardModel(
  cruise: CategoryPricingAvailability,
): CruiseContextCardProps {
  const currency = cruise.categories[0]?.currency ?? '';
  const remaining = remainingLabel(cruise.availableToSell);
  const lowInventory =
    cruise.availableToSell !== undefined &&
    cruise.availableToSell > 0 &&
    cruise.availableToSell < LOW_INVENTORY_THRESHOLD;

  // A sailing whose displayed route begins and ends in the same city reads as
  // "Ushuaia ⟲ Roundtrip", not "Ushuaia → Ushuaia". Compared on the displayed endpoints
  // (what `tripRoute` resolves) rather than the raw sailing ports, so a cruise tour that
  // genuinely starts and ends in different hotel cities stays a one-way even when its
  // sailing legs loop. On a roundtrip the destination is dropped — "Roundtrip" carries it.
  const { from, to } = tripRoute(cruise);
  const roundtrip = from === to;

  return {
    category: brandToCategory(cruise.brand),
    title: cruise.cruiseName,
    meta: cruise.marketCode ?? currency,
    ship: cruise.shipName,
    voyageCode: cruise.cruiseId,
    from,
    ...(roundtrip ? { roundtrip } : { to }),
    nightsLabel: nightsLabel(cruise.nights, cruise.totalNights),
    ...(remaining !== undefined && { remaining }),
    lowInventory,
    itinerary: toItinerarySummary(cruise),
  };
}
