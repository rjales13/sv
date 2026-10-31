import { Separator } from '@vas/ui/components/separator';
import { cn } from '@vas/ui/lib/utils';
import { Fragment } from 'react';
import { CategoryColumn, type CategoryColumnProps } from './category-column.tsx';

/*
  CategoryBand — one row of category columns, separated by hairline rules
  (SApp_UX-VD, node 2562:61098).

  `items-stretch` is what makes the rules work: Separator carries
  `data-vertical:self-stretch`, so each one spans the tallest column in the band
  without anyone measuring heights.
*/

export interface CategoryBandProps {
  /** Columns left to right; a 1px rule is drawn between each pair. */
  columns: CategoryColumnProps[];
  /** Called when the user selects a fare tier; not called for soldout rows. */
  onItemSelect?: (abbrev: string) => void;
  className?: string;
}

export function CategoryBand({ columns, onItemSelect, className }: CategoryBandProps) {
  return (
    <div data-slot="category-band" className={cn('flex items-stretch gap-1.5', className)}>
      {columns.map((column, i) => (
        <Fragment key={column.title}>
          {i > 0 && <Separator orientation="vertical" className="bg-line" />}
          <CategoryColumn {...column} {...(onItemSelect !== undefined && { onItemSelect })} />
        </Fragment>
      ))}
    </div>
  );
}
