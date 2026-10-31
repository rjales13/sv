import { cn } from '@vikings/ui/lib/utils';

/*
  StateroomsSelection — section header + selected category summary row
  (ShoppingApp_UX-VD, node 2569:126386).

  Figma ships two variants on `Property 1`:
    Default    — real data: category name + code visible
    unselected — em-dash placeholders when no category is selected yet

  Both states derive from prop presence, keeping the variant distinction in
  data rather than a boolean flag. Width is fixed at 324px per the Figma spec.

  The right-hand placeholder div (83×18px) in the title row has no content in
  either Figma variant — omitted until a concrete design lands there.
*/

const EMPTY = '–';

export interface StateroomsSelectionProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Long category name, e.g. "Deluxe Veranda". Omit for unselected/placeholder state. */
  categoryName?: string;
  /** Short category code, e.g. "DV3". Omit for unselected/placeholder state. */
  categoryCode?: string;
}

export function StateroomsSelection({
  categoryName,
  categoryCode,
  className,
  ...divProps
}: StateroomsSelectionProps) {
  return (
    <div
      data-slot="staterooms-selection"
      className={cn('flex w-[324px] flex-col gap-2', className)}
      {...divProps}
    >
      {/* Row 1: section title — always visible */}
      <div className="flex w-full items-start justify-between">
        <p className="truncate text-label-lg font-semibold text-fjord">Stateroom Selection</p>
      </div>

      {/* Row 2: selected category name + code, pb-[2px] matches Figma row height */}
      <div className="flex w-full items-start justify-between">
        <div className="flex items-center gap-2 whitespace-nowrap pb-[2px]">
          <span className="overflow-hidden text-ellipsis text-body-sm font-normal text-ink">
            {categoryName ?? EMPTY}
          </span>
          <span className="overflow-hidden text-ellipsis text-label-sm font-semibold text-ink">
            {categoryCode ?? EMPTY}
          </span>
        </div>
      </div>
    </div>
  );
}
