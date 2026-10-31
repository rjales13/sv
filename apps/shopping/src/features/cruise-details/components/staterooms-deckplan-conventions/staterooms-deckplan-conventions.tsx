import { cn } from '@vikings/ui/lib/utils';

/*
  StateroomsDeckplanConventions — color-swatch legend for the stateroom deck plan
  (ShoppingApp_UX-VD, node 2566:115978).

  Figma ships two variants on `Property 1`:
    2 lines — all items; wraps across two rows at 852px container width
    1 line  — first six items only, fits on a single row

  Both states are data-driven from the `items` prop, so the wrapping happens
  naturally via flexbox. Callers control line count by trimming the array.

  Colors come from Figma (#a2bacb light steel-blue, #83a4a5 deeper teal) and
  are passed through the items array — they are not design-system tokens.
*/

export interface DeckPlanConventionItem {
  /** Venue or facility display name, e.g. "Fitness Center". */
  label: string;
  /** Hex color of the legend swatch, e.g. "#a2bacb". */
  color: string;
}

export interface StateroomsDeckplanConventionsProps extends React.ComponentPropsWithoutRef<'ul'> {
  /** Legend items, each pairing a color swatch with a venue label. */
  items: DeckPlanConventionItem[];
}

export function StateroomsDeckplanConventions({
  items,
  className,
  ...ulProps
}: StateroomsDeckplanConventionsProps) {
  return (
    <ul
      data-slot="staterooms-deckplan-conventions"
      className={cn('flex flex-wrap items-center justify-center gap-x-6 gap-y-3', className)}
      {...ulProps}
    >
      {items.map((item) => (
        <li key={item.label} className="flex shrink-0 items-center gap-1.75">
          <div
            data-slot="deckplan-swatch"
            aria-hidden={true}
            className="size-4 shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="whitespace-nowrap text-body-sm font-normal text-ink">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
