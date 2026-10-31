import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import type * as React from 'react';

/*
  RouteIndicator — the origin/destination label in the context card
  (ShoppingApp_UX-VD, node 3060:129339).

  Figma models two variants on `Property 1`:
    default    →  "Paris → Zürich"    (icon/navigation/arrow_forward-16)
    roundtrip  →  "Paris ⇌ Roundtrip" (icon/action/sync, shown as IconActionSync16)

  The sr-only "to" on the default variant ensures the direction is conveyed to
  screen readers without relying on the arrow glyph (WCAG 1.4.1).

  Spreads all `<div>` HTML attributes so callers can attach `data-testid` and
  other data attributes without wrapper elements.
*/

export interface RouteIndicatorProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Departure city, e.g. "Paris". */
  from: string;
  /** Destination city. Displayed on the default variant; ignored on roundtrip. */
  to?: string;
  /** When true renders the roundtrip variant with the sync icon. Default false. */
  roundtrip?: boolean;
}

export function RouteIndicator({
  from,
  to,
  roundtrip = false,
  className,
  ...divProps
}: RouteIndicatorProps) {
  return (
    <div
      data-slot="route-indicator"
      className={cn('flex items-center gap-1', className)}
      {...divProps}
    >
      <span className="whitespace-nowrap text-label-lg font-semibold text-fjord">{from}</span>

      {roundtrip ? (
        <>
          {/* Sync icon signals bidirectional travel; the word "Roundtrip" carries the meaning. */}
          <Icon name="IconActionSync16" size={16} aria-hidden />
          <span className="whitespace-nowrap text-label-lg font-semibold text-fjord">
            Roundtrip
          </span>
        </>
      ) : (
        <>
          <Icon name="IconNavigationArrowForward16" size={16} aria-hidden />
          {/* The arrow glyph is decorative, so the direction must also exist as text. */}
          <span className="sr-only">to</span>
          {to && (
            <span className="whitespace-nowrap text-label-lg font-semibold text-fjord">{to}</span>
          )}
        </>
      )}
    </div>
  );
}
