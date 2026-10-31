import { cn } from '@vikings/ui/lib/utils';

/*
  StateroomsCategorySelection — compact panel showing the agent's current
  stateroom category pick (ShoppingApp_UX-VD, node 2544:97905).

  Figma ships two variants on `Property 1`:
    Default  — real data: category name + code + formatted price
    empty    — em-dash placeholders when no category is selected yet

  Both are derived here from whether the props are present, so the "empty"
  state is simply the absence of `categoryName`, `categoryCode` and `price`.
  The section title "Category Selection" is always visible.

  Width: 177px per the Figma spec (matches the surrounding band grid).
  Gap 11px between header and body rows is non-standard; kept as an
  arbitrary value rather than snapped to spacing/sm (12px) for pixel parity.
*/

const EMPTY = '–';

export interface StateroomsCategorySelectionProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Long category name, e.g. "Deluxe Veranda". Omit for empty/placeholder state. */
  categoryName?: string;
  /** Short category code, e.g. "DV3". Omit for empty/placeholder state. */
  categoryCode?: string;
  /** Formatted price string, e.g. "$9,999". Omit for empty/placeholder state. */
  price?: string;
}

export function StateroomsCategorySelection({
  categoryName,
  categoryCode,
  price,
  className,
  ...divProps
}: StateroomsCategorySelectionProps) {
  return (
    <div
      data-slot="staterooms-category-selection"
      className={cn(
        'flex w-[177px] flex-col items-center rounded-sm border border-line bg-surface-subtle px-2 py-3',
        className,
      )}
      {...divProps}
    >
      <div className="flex w-full flex-col items-center justify-center gap-[11px]">
        {/* Section header — always visible, bottom-ruled */}
        <div className="flex w-[155px] items-center justify-center border-b border-line py-2">
          <p className="truncate text-center text-label-lg font-semibold text-fjord">
            Category Selection
          </p>
        </div>

        {/* Category + price body */}
        <div className="flex w-[129px] flex-col items-center gap-px whitespace-nowrap">
          <div className="flex w-full items-center justify-center gap-1 py-[2px] text-ink">
            <span className="overflow-hidden text-ellipsis text-right text-body-sm font-normal">
              {categoryName ?? EMPTY}
            </span>
            <span className="overflow-hidden text-ellipsis text-label-sm font-semibold">
              {categoryCode ?? EMPTY}
            </span>
          </div>
          <p className="w-full overflow-hidden text-ellipsis text-center text-title-lg font-semibold text-fjord">
            {price ?? EMPTY}
          </p>
        </div>
      </div>
    </div>
  );
}
