import { Badge } from '@vikings/ui/components/badge';
import { Tag } from '@vikings/ui/components/tag';
import { cn } from '@vikings/ui/lib/utils';
import { CATEGORY_MARK, type CardHeaderCategory } from '@/shared/components/card-header';
import { ItineraryRow, type ItineraryRowProps } from '@/shared/components/itinerary-row';
import { RemainingCount } from '@/shared/components/remaining-count';
import { RouteIndicator } from '@/shared/components/route-indicator';

/*
  CruiseContextCard — the compact banner that keeps the sailing an agent is
  working on in view (ShoppingApp_UX-VD, node 1043:176419).

  Figma models this as two variants on `Property 1` — "cruise package" and
  "cruise only" — but that axis bundles two unrelated things: how many itinerary
  stops render, and whether the remaining count is navy or red. They are split
  here, because a package brackets the sailing with hotel nights (so the stop
  list is data, not a variant) while navy-vs-red is an inventory signal. Tying
  them together would make a nearly-sold-out package unable to warn, and a
  well-stocked cruise-only sailing permanently urgent.

  Same decomposition the sibling slices already use: card-header turns 11 flat
  variants into props, and category-column treats Figma's "3/4/5/6 columns" as
  array length rather than a state.
*/

/** One itinerary stop — every ItineraryRow prop except the layout escape hatch. */
export type CruiseContextItineraryItem = Omit<ItineraryRowProps, 'className'>;

export interface CruiseContextCardProps {
  /** Product line — sets the chip label and fill, shared with CardHeader. */
  category: CardHeaderCategory;
  title: string;
  /** Leading meta item: fare currency, e.g. "EUR". */
  meta: string;
  /** Ship name. Renders after a hairline divider; omit on an extension. */
  ship?: string;
  /** Voyage code. Renders after a hairline divider; omit on an extension. */
  voyageCode?: string;
  /** Origin city, e.g. "Paris". */
  from: string;
  /** Destination city, e.g. "Zürich". Ignored when `roundtrip` is true. */
  to?: string;
  /** Renders the roundtrip variant — sync icon and "Roundtrip" label instead of the to city. */
  roundtrip?: boolean;
  /** Nights Tag text, e.g. "7 Cruise Nights / 11 Total Nights". */
  nightsLabel: string;
  /** Availability count, e.g. "9+ remaining". Omit when not applicable. */
  remaining?: string;
  /** Paints the remaining count red. Independent of the itinerary length. */
  lowInventory?: boolean;
  /** Stops left to right. A package includes its hotel nights, cruise-only does not. */
  itinerary: CruiseContextItineraryItem[];
  className?: string;
}

/** 11px semibold uppercase overline in tertiary ink — the meta strip. */
const META = 'text-overline font-semibold uppercase tracking-overline text-ink-tertiary';

export function CruiseContextCard({
  category,
  title,
  meta,
  ship,
  voyageCode,
  from,
  to,
  roundtrip,
  nightsLabel,
  remaining,
  lowInventory = false,
  itinerary,
  className,
}: CruiseContextCardProps) {
  const { label, fill } = CATEGORY_MARK[category];

  return (
    <div
      data-slot="cruise-context-card"
      className={cn(
        'flex w-full flex-col gap-3 overflow-clip rounded-md border border-line bg-surface p-4 shadow-raised',
        className,
      )}
    >
      {/* Identity row — chip, title and meta strip against the inventory count */}
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Badge className={cn('shrink-0', fill)}>{label}</Badge>
          <span className="truncate text-h4 font-semibold text-fjord">{title}</span>

          <div className="flex shrink-0 items-end gap-2.5">
            <span className={META}>{meta}</span>
            {ship && (
              <>
                <MetaDivider />
                <span className={META}>{ship}</span>
              </>
            )}
            {voyageCode && (
              <>
                <MetaDivider />
                <span className={META}>{voyageCode}</span>
              </>
            )}
          </div>
        </div>

        {remaining && (
          <RemainingCount
            data-testid="cruise-context-remaining"
            data-low-inventory={lowInventory}
            count={remaining}
            lowInventory={lowInventory}
          />
        )}
      </div>

      {/* Route + nights against the itinerary strip */}
      <div className="flex w-full items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start gap-2">
            <RouteIndicator
              data-testid="cruise-context-route"
              from={from}
              // exactOptionalPropertyTypes: omit the key rather than pass undefined.
              {...(to !== undefined ? { to } : {})}
              {...(roundtrip ? { roundtrip } : {})}
            />

            <div className="flex w-full items-center gap-2">
              <Tag state="default">{nightsLabel}</Tag>
            </div>
          </div>

          {itinerary.length > 0 && (
            <>
              <span
                data-slot="cruise-context-divider"
                aria-hidden="true"
                className="h-[50px] w-px shrink-0 bg-line"
              />
              <div className="flex items-center gap-2">
                {itinerary.map((stop) => (
                  // w-[152px]: Figma pins each stop to a fixed column so the
                  // dates line up across cards rather than shifting with text.
                  <ItineraryRow
                    key={`${stop.date}-${stop.cityCode}`}
                    {...stop}
                    className="w-[152px] shrink-0"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 1x14px hairline between meta items. Decorative — hidden from assistive tech. */
function MetaDivider() {
  return <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-surface-disabled opacity-40" />;
}
