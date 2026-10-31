import { Checkbox } from '@vikings/ui/components/checkbox';
import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { ExtensionDescription } from '@/features/cruise-details/components/extensions-description';
import { CardHeader, type CardHeaderCategory } from '@/shared/components/card-header';
import { ItineraryRow } from '@/shared/components/itinerary-row';

/*
  ExtensionsCard — a pre/post/land-package extension row card
  (ShoppingApp_UX-VD, node 1786:171951).

  Figma ships 4 flat variants but they decompose into 3 orthogonal axes:
    soldOut    → SOLD OUT badge in header, no checkbox
    included   → land-package: subtle bg, no shadow, invisible checkbox spacer
    stops      → 1 (single hotel) or N (multi hotel) — data-driven, not a variant

  The "Included" state in the header is rendered via CardHeader `amount="Included"
  currencyCode=""` (PriceCurrency base variant) since CardHeader's right-side slot
  is not extensible. Flagged for design reconciliation.
*/

/** Check-in / check-out pair + the hotel at this stop. */
export interface ExtensionCardHotelStop {
  departure: { date: string; cityCode: string; cityName: string };
  arrival: { date: string; cityCode: string; cityName: string };
  hotel: { name: string; type: string; nights: number };
}

export interface ExtensionCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Product line / position — sets the chip label and fill. */
  category: CardHeaderCategory;
  title: string;
  /** Duration label, e.g. "4 NIGHTS". */
  meta: string;
  /** Replaces the right side with a SOLD OUT badge; hides the checkbox. */
  soldOut?: boolean;
  /**
   * Land-package state: applies subtle bg, no shadow, and hides the checkbox
   * while keeping its layout footprint. Shows "Included" on the header right side.
   */
  included?: boolean;
  /** Count prefix before the price, e.g. "54 Available". Ignored when soldOut or included. */
  priceLabel?: string;
  /** Pre-formatted price, e.g. "$4,999.00". */
  amount?: string;
  currencyCode?: string;
  /** The hotel stops in this extension, in order. */
  stops: ExtensionCardHotelStop[];
  /** Prose description text — renders as a paragraph. */
  descriptionText?: string;
  /** Bullet-point inclusions — renders as a disc list. */
  descriptionBullets?: string[];
  /** Controlled checkbox state. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: three orthogonal booleans (soldOut / included / price props) are genuinely independent axes — each conditional reflects a distinct design requirement and all are covered by test branches
export function ExtensionsCard({
  category,
  title,
  meta,
  soldOut = false,
  included = false,
  priceLabel,
  amount,
  currencyCode = 'USD',
  stops,
  descriptionText,
  descriptionBullets,
  checked,
  onCheckedChange,
  className,
  ...divProps
}: ExtensionCardProps) {
  const hasDescription =
    descriptionText != null || (descriptionBullets != null && descriptionBullets.length > 0);

  return (
    <div
      data-slot="extensions-card"
      className={cn(
        'flex flex-col overflow-hidden rounded-md border border-line',
        included ? 'bg-surface-subtle' : 'bg-white shadow-card',
        className,
      )}
      {...divProps}
    >
      <CardHeader
        category={category}
        title={title}
        meta={meta}
        soldOut={soldOut}
        included={included}
        {...(!included
          ? {
              ...(amount !== undefined ? { amount } : {}),
              currencyCode,
              ...(priceLabel !== undefined ? { priceLabel } : {}),
            }
          : {})}
      />

      <div className="flex items-start gap-5 px-4 pb-3 pt-2">
        {/* Stops column — divides between rows when more than one */}
        <div className="flex flex-col divide-y divide-line shrink-0">
          {stops.map((stop, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stops lack a stable identity; position is the key
            <div key={i} className="flex items-start gap-1 py-2">
              <ItineraryRow
                variant="hotel"
                date={stop.departure.date}
                cityCode={stop.departure.cityCode}
                cityName={stop.departure.cityName}
                className="w-[152px] shrink-0"
              />
              <ItineraryRow
                variant="hotel"
                date={stop.arrival.date}
                cityCode={stop.arrival.cityCode}
                cityName={stop.arrival.cityName}
                className="w-[152px] shrink-0"
              />
              <HotelRow hotel={stop.hotel} className="w-[295px] shrink-0" />
            </div>
          ))}
        </div>

        {/* 404px is the designed width, but this is the one column allowed to shrink: below
            ~1290px the fixed stays + description + checkbox no longer fit, and a rigid
            description would push the checkbox out of line with cards that have none. */}
        {hasDescription && (
          <ExtensionDescription
            {...(descriptionText !== undefined ? { text: descriptionText } : {})}
            {...(descriptionBullets !== undefined ? { bullets: descriptionBullets } : {})}
            className="w-[404px] min-w-0 shrink"
          />
        )}

        {/* Checkbox area — omit entirely when sold out; disabled (visible) when included.
            `ml-auto` pins it to the right edge: many extensions have no description column,
            and without it the checkbox would sit mid-card, at a different x on every card. */}
        {!soldOut && (
          <div className="ml-auto flex w-[199px] shrink-0 items-center gap-2 py-3">
            <Checkbox
              size="default"
              checked={included ? true : (checked ?? false)}
              disabled={included}
              {...(!included && onCheckedChange ? { onCheckedChange } : {})}
            />
            <span className="text-body-md text-ink">
              {included ? 'Included / Land Package' : 'Add this extension'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Hotel name + type/nights row within a stop. */
function HotelRow({
  hotel,
  className,
}: {
  hotel: ExtensionCardHotelStop['hotel'];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2">
        <Icon name="IconLodgingHotelBuilding" size={24} />
        <span className="truncate text-label-md font-semibold text-fjord">{hotel.name}</span>
      </div>
      <div className="flex items-baseline gap-[3px] pl-8">
        <span className="text-caption text-ink">{hotel.type}</span>
        <span aria-hidden="true" className="text-body-xsm text-fjord">
          ·
        </span>
        <span className="text-overline font-semibold uppercase tracking-overline text-ink">
          {hotel.nights} {hotel.nights === 1 ? 'night' : 'nights'}
        </span>
      </div>
    </div>
  );
}
