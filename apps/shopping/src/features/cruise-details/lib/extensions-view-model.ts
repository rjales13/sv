import type { Extension, ExtensionCategory, ExtensionStay } from '@vikings/contracts';
import { formatDateWithWeekday } from '@vikings/ui/lib/date-format';
import type {
  ExtensionCardHotelStop,
  ExtensionCardProps,
} from '../components/extensions-card/index.ts';

// View model: curated `Extension` -> ExtensionsCard props (ADR-0016 § 8).
//
// This file is where all the formatting that USED to live in the data now lives. The old
// `extensions-fixtures.ts` was typed as `Omit<ExtensionCardProps, …>` and stored
// `'$2,799.00'`, `'12 Available'` and `'27JUN2027 (SAT)'` as data — none of which can be
// summed, compared, or re-formatted for another office. The port carries numbers and ISO
// dates; the strings are produced here, at the edge, where changing them is a view decision.

/** The controlled props the tab owns; everything else comes from the model. */
export type ExtensionCardModel = Omit<
  ExtensionCardProps,
  'checked' | 'onCheckedChange' | 'className'
> & {
  /** EVO's `invcode` — a stable id, unlike the array index the store used to key on. */
  code: string;
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Which side of the sailing a hotel falls on — the extensions card's hotel chip and the Build
 * Panel's extension lines. Stopovers sit on the same side as their base leg. A land package
 * has no side: it holds hotels before AND after the cruise.
 */
export function hotelSideLabel(
  category: ExtensionCategory,
): 'PRE HOTEL' | 'POST HOTEL' | undefined {
  if (category === 'land-package') return undefined;
  return category === 'post' || category === 'post-stopover' ? 'POST HOTEL' : 'PRE HOTEL';
}

/**
 * Maps one stay onto a card stop.
 *
 * Falls back to the stay's own title when EVO names no hotel, and to an empty city rather
 * than inventing one — the card renders what it is given, and a blank beats a guess.
 */
function toStop(stay: ExtensionStay): ExtensionCardHotelStop {
  const cityCode = stay.hotel?.portCode ?? '';
  const cityName = stay.hotel?.city ?? '';
  return {
    departure: { date: formatDateWithWeekday(stay.fromDate), cityCode, cityName },
    arrival: { date: formatDateWithWeekday(stay.toDate), cityCode, cityName },
    hotel: {
      name: stay.hotel?.name ?? stay.title,
      type: hotelSideLabel(stay.category) ?? 'PRE HOTEL',
      nights: stay.nights,
    },
  };
}

/**
 * Maps a curated extension onto card props.
 *
 * `priceLabel` and `amount` are omitted entirely when the extension is sold out or bundled
 * with the fare — the card replaces that side with a SOLD OUT badge or "Included", so passing
 * a price would be dead data a future change could accidentally surface.
 */
export function toExtensionCardModel(extension: Extension): ExtensionCardModel {
  const priced = !extension.soldOut && !extension.includedInFare;

  return {
    code: extension.code,
    category: extension.category,
    title: extension.title,
    meta: `${extension.nights} ${extension.nights === 1 ? 'NIGHT' : 'NIGHTS'}`,
    ...(extension.soldOut && { soldOut: true }),
    ...(extension.includedInFare && { included: true }),
    ...(priced &&
      extension.remainingCount !== undefined && {
        priceLabel: `${extension.remainingCount} Available`,
      }),
    ...(priced &&
      extension.doublePrice !== undefined && {
        amount: formatMoney(extension.doublePrice, extension.currency),
      }),
    currencyCode: extension.currency,
    stops: extension.stays.map(toStop),
    // Empty until `GetHotelExtensionInfo` is joined (ADR-0016 § 11). The card omits the list
    // rather than rendering an empty one.
    ...(extension.descriptionBullets.length > 0 && {
      descriptionBullets: extension.descriptionBullets,
    }),
  };
}

/** The per-person double-occupancy price an agent is committing to, or 0 when there is none. */
export function extensionPrice(extension: Extension): number {
  return extension.includedInFare ? 0 : (extension.doublePrice ?? 0);
}
