import { Button } from '@vikings/ui/components/button';
import { Icon } from '@vikings/ui/components/icon';
import { Tag } from '@vikings/ui/components/tag';
import { cn } from '@vikings/ui/lib/utils';
import { CardHeader, type CardHeaderCategory } from '@/shared/components/card-header';
import { CategoryBand, type CategoryColumnProps } from '@/shared/components/category-column';
import { ItineraryRow, type ItineraryVariant } from '@/shared/components/itinerary-row';
import { RemainingCount } from '@/shared/components/remaining-count';

/*
  ResultsCard — a complete cruise result card (ShoppingApp_UX-VD, node 2189:392310).

  Assembles CardHeader, an itinerary panel, a category pricing band, and a footer
  into the single card unit that appears in the results list. Seven code-connect
  elements are wired to their real components:

    CardHeader            → the 48px blue header bar
    ItineraryRow ×N       → left-panel stop list
    CategoryBand          → right-panel stateroom pricing grid
    Icon (arrow-forward)  → origin → destination separator in the summary row
    Tag                   → nights label chip in the summary row
    Checkbox              → "Select to compare" toggle in the footer
    Button (secondary)    → "Cruise details" CTA in the footer

  ⚠️  Two open items to confirm with Viking before connecting live data:
    1. The itinerary panel height is fixed at 252px (Figma value). Raise a ticket
       if the design allows a variable-height panel so this becomes a prop.
    2. The border-r between the itinerary and pricing panels uses #eaf0f6, a
       light blue-grey with no exact DS token between line-subtle and line-tint.
*/

export interface ResultsCardItineraryItem {
  variant: ItineraryVariant;
  date: string;
  cityCode: string;
  cityName: string;
}

export interface ResultsCardProps {
  // ── CardHeader (code connect: I2189:392310;748:48750) ───────────────────────
  /** Product line or extension position — sets the category chip label and fill. */
  category: CardHeaderCategory;
  title: string;
  /** Leading meta: currency code ("EUR") on cruises, duration ("4 Nights") on extensions. */
  meta: string;
  ship?: string;
  voyageCode?: string;
  /** Replaces the whole price block with a SOLD OUT badge. */
  soldOut?: boolean;
  /** Availability prefix before the price, e.g. "Starting at" or "54 Available". */
  priceLabel?: string;
  /** Pre-formatted price, e.g. "$5,999.00". Formatting is the caller's job. */
  amount?: string;
  currencyCode?: string;

  // ── Summary row ──────────────────────────────────────────────────────────────
  /** Origin city, e.g. "Paris". */
  from: string;
  /** Destination city, e.g. "Zürich". */
  to: string;
  /** Nights Tag text, e.g. "7 Cruise Nights / 11 Total Nights". */
  nightsLabel: string;
  /** Availability count, e.g. "9+ remaining". Omit when not applicable. */
  remaining?: string;
  /** Paints the remaining count red. True when inventory is below the low-inventory threshold. */
  lowInventory?: boolean;

  // ── Itinerary panel (code connect: I2189:392310;748:50935;748:49055…) ───────
  itinerary: ResultsCardItineraryItem[];

  // ── Pricing panel (code connect: I2189:392310;2665:243466) ──────────────────
  pricingColumns: CategoryColumnProps[];

  // ── Footer ───────────────────────────────────────────────────────────────────
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onCruiseDetails?: () => void;
  /** Called when the user clicks a fare tier in the pricing grid — navigates to the
   *  Staterooms tab with that category pre-selected. */
  onPricelineSelect?: (abbrev: string) => void;

  className?: string;
}

export function ResultsCard({
  category,
  title,
  meta,
  ship,
  voyageCode,
  soldOut,
  priceLabel,
  amount,
  currencyCode,
  from,
  to,
  nightsLabel,
  remaining,
  lowInventory = false,
  itinerary,
  pricingColumns,
  // selected and onSelectChange are reserved for the future compare feature
  onCruiseDetails,
  onPricelineSelect,
  className,
}: ResultsCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-clip rounded-md border border-line bg-surface',
        'shadow-[0px_10px_40px_1px_rgba(0,0,0,0.09)]',
        className,
      )}
    >
      {/* CardHeader — code connect I2189:392310;748:48750
          exactOptionalPropertyTypes: spread only defined optionals so we never
          pass `prop={undefined}`, which the strict flag rejects on CardHeader. */}
      <CardHeader
        category={category}
        title={title}
        meta={meta}
        {...(ship !== undefined && { ship })}
        {...(voyageCode !== undefined && { voyageCode })}
        {...(soldOut !== undefined && { soldOut })}
        {...(priceLabel !== undefined && { priceLabel })}
        {...(amount !== undefined && { amount })}
        {...(currencyCode !== undefined && { currencyCode })}
      />

      {/* Summary row — origin → destination, nights tag, availability count */}
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
        <div className="flex items-center gap-[13px]">
          <div className="flex items-center gap-1">
            <span className="whitespace-nowrap text-label-lg font-semibold text-fjord">{from}</span>
            {/* Icon — code connect I2189:392310;616:138939 */}
            <Icon name="IconNavigationArrowForward" size={16} />
            <span className="whitespace-nowrap text-label-lg font-semibold text-fjord">{to}</span>
          </div>
          {/* Tag — code connect I2189:392310;616:138943 */}
          <Tag>{nightsLabel}</Tag>
        </div>
        {remaining && <RemainingCount count={remaining} lowInventory={lowInventory} />}
      </div>

      {/* Main panel — left itinerary list, right category pricing band */}
      <div className="flex shrink-0 items-stretch overflow-clip">
        {/* ItineraryContainer — code connect I2189:392310;748:50935;748:49055… */}
        <div className="flex min-h-[252px] w-[189px] shrink-0 flex-col items-start gap-4 overflow-clip border-r border-[#eaf0f6] bg-surface-subtle px-4 py-4">
          {itinerary.map((item) => (
            <ItineraryRow key={`${item.date}-${item.cityCode}`} {...item} className="w-full" />
          ))}
        </div>

        {/* CategoryBand — code connect I2189:392310;2665:243466
            p-3: the band's content frame sits at x=12, y=12 inside the outer
            PriceLines-group frame (Figma metadata). */}
        <div className="flex-1 overflow-clip p-3">
          <CategoryBand
            columns={pricingColumns}
            className="h-full"
            {...(onPricelineSelect !== undefined && { onItemSelect: onPricelineSelect })}
          />
        </div>
      </div>

      {/* Footer — "Cruise details" CTA; "Select to compare" is a future feature */}
      <div className="flex shrink-0 items-center justify-end border-t border-line p-3">
        {/* Button — code connect I2189:392310;616:139069 */}
        <Button variant="secondary" onClick={onCruiseDetails}>
          Cruise details
          <Icon name="IconNavigationChevronRight" size={24} />
        </Button>
      </div>
    </div>
  );
}
