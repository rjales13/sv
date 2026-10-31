import { cn } from '@vikings/ui/lib/utils';
import type * as React from 'react';

/*
  RemainingCount — the inventory availability indicator shown in the context
  card (ShoppingApp_UX-VD, node 3060:129349).

  Figma models two variants on `Property 1`:
    more9  →  "9+ remaining"  primary   (semantic token text-primary)
    less9  →  "7 remaining"   red       (semantic token text-destructive)

  The variant name is a threshold, not a display value — the actual count is
  data-driven. The only axis the component owns is whether the count is below
  the low-inventory threshold; everything else is the caller's concern.

  Color alone must not carry the warning (WCAG 1.4.1). When `lowInventory` is
  true an sr-only supplement "Low availability" is appended so screen readers
  get the signal without relying on color.

  Spreads all `<span>` HTML attributes so callers can attach `data-testid`,
  `data-*` state flags, and ARIA attributes without needing wrapper divs.
*/

export interface RemainingCountProps extends React.ComponentPropsWithoutRef<'span'> {
  /** Availability text, e.g. "9+ remaining" or "7 remaining". */
  count: string;
  /** Paints the count red and appends an sr-only warning. Default false. */
  lowInventory?: boolean;
}

export function RemainingCount({
  count,
  lowInventory = false,
  className,
  ...spanProps
}: RemainingCountProps) {
  return (
    <span
      data-slot="remaining-count"
      className={cn(
        'shrink-0 whitespace-nowrap text-label-lg font-semibold',
        lowInventory ? 'text-destructive' : 'text-primary',
        className,
      )}
      {...spanProps}
    >
      {count}
      {lowInventory && <span className="sr-only">Low availability</span>}
    </span>
  );
}
