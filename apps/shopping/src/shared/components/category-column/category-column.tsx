import { cn } from '@vas/ui/lib/utils';
import { useId } from 'react';
import { PriceLine, type PriceLineProps } from '../price-line/index.ts';

/*
  CategoryColumn — one priced stateroom category in the fare grid
  (SApp_UX-VD, node 2562:61098; the column frames inside each variant).

  A centred category name over a stack of PriceLine rows. The Figma variants
  named "3/4/5/6 columns" are not states — they are just different array
  lengths, so column count is data, not a prop.

  Known duplication: packages/ui/cr-pricing-card.tsx already renders this
  shape internally (FareCategoryColumn/VoyageBand), but against the older row
  (availability dot + bare code) rather than PriceLine's Tag chip, and with a
  different title ramp. Left standalone deliberately; converging the two would
  change that card's appearance and is a separate call.
*/

/** One fare tier in the column — every PriceLine prop except the layout escape hatch. */
export type CategoryColumnItem = Omit<PriceLineProps, 'className'>;

export interface CategoryColumnProps {
  /** Stateroom category name, e.g. "Owners Suite" (EVO `categorylist[].description`). */
  title: string;
  /** Fare tiers, rendered top to bottom. */
  items: CategoryColumnItem[];
  /** Called when the user selects a fare tier; not called for soldout rows. */
  onItemSelect?: (abbrev: string) => void;
  className?: string;
}

export function CategoryColumn({ title, items, onItemSelect, className }: CategoryColumnProps) {
  const titleId = useId();

  return (
    // biome-ignore lint/a11y/useSemanticElements: fieldset groups form controls and expects a legend; this is a read-only price column
    <div
      data-slot="category-column"
      role="group"
      aria-labelledby={titleId}
      className={cn('flex min-w-[146px] flex-1 flex-col gap-1.5', className)}
    >
      {/* Fixed-height title block: a wrapping name would push this column's rows
          below its neighbours' and break alignment across the band. */}
      <div className="w-full px-2 py-1.5">
        <span
          id={titleId}
          data-slot="category-column-title"
          className="block w-full truncate text-center text-label-md font-semibold text-fjord"
        >
          {title}
        </span>
      </div>

      {items.map((item) => (
        <PriceLine
          key={item.abbrev}
          {...item}
          {...(onItemSelect !== undefined && { onSelect: () => onItemSelect(item.abbrev) })}
        />
      ))}
    </div>
  );
}
