import type { IconName } from '@vikings/ui/components/icon';
import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';

export type ItineraryVariant = 'hotel' | 'sailing' | 'port' | 'departure' | 'arrival' | 'transit';

// Closed set: Figma's instance-swap becomes a domain enum so callers can't
// pass an arbitrary glyph that has no cruise-itinerary meaning. Exported so the
// sibling stop renderers resolve the same glyph rather than each keeping a copy
// that can drift.
export const VARIANT_ICON: Record<ItineraryVariant, IconName> = {
  hotel: 'IconContentHotel',
  sailing: 'IconContentSailing',
  port: 'IconContentDirectionsBoat',
  // The three transitions that bracket and interrupt the sailing. They read as
  // stop kinds rather than a separate axis: a day is exactly one of these.
  departure: 'IconTravelDeparture',
  arrival: 'IconTravelArrival',
  transit: 'IconTravelTransit',
};

export interface ItineraryRowProps {
  variant: ItineraryVariant;
  date: string;
  cityCode: string;
  cityName: string;
  className?: string;
}

export function ItineraryRow({ variant, date, cityCode, cityName, className }: ItineraryRowProps) {
  return (
    <div data-slot="itinerary-row" className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2">
        <Icon name={VARIANT_ICON[variant]} size={24} />
        <span className="whitespace-nowrap text-label-sm font-semibold text-fjord">{date}</span>
      </div>
      {/* pl-8 = icon (24px) + gap (8px) keeps the city line under the date; gap-[3px] because gap-0.75 emits no rule in this Tailwind v4 build */}
      <div className="flex items-baseline gap-[3px] overflow-hidden pl-8">
        <span className="shrink-0 text-caption text-ink">{cityCode}</span>
        <span aria-hidden="true" className="shrink-0 text-body-xsm text-fjord">
          ·
        </span>
        <span className="truncate text-caption text-ink">{cityName}</span>
      </div>
    </div>
  );
}
