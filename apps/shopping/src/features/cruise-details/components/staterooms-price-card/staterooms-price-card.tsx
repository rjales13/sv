import { cn } from '@vikings/ui/lib/utils';
import { StateroomsCategorySelection } from '@/features/cruise-details/components/staterooms-category-selection';
import { CategoryBand, type CategoryBandProps } from '@/shared/components/category-column';

/*
  StateroomsPriceCard — the full stateroom pricing panel
  (ShoppingApp_UX-VD, node 2564:72660).

  Composes the left-side category-selection summary and the right-side price grid:
    Default    → a category is selected: StateroomsCategorySelection shows name/code/price
    unselected → no category chosen yet: StateroomsCategorySelection shows em-dash placeholders

  Both states are derived from the presence of `selectedCategory`, keeping the
  variant distinction in the data rather than a separate boolean prop.

  Shadow: elevation/1 (--vk-shadow-raised, "shadow-raised") per globals.css.
*/

export interface SelectedCategory {
  /** Stateroom category name, e.g. "Deluxe Veranda". */
  name: string;
  /** Category abbreviation code, e.g. "DV3". */
  code: string;
  /** Pre-formatted price string, e.g. "$9,999". */
  price: string;
}

export interface StateroomsPriceCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Currently selected category; omit for the unselected/empty state. */
  selectedCategory?: SelectedCategory;
  /** Price-grid columns, left to right. */
  columns: CategoryBandProps['columns'];
  /** Called when the agent selects a fare tier; not called for soldout rows. */
  onItemSelect?: (abbrev: string) => void;
}

export function StateroomsPriceCard({
  selectedCategory,
  columns,
  onItemSelect,
  className,
  ...divProps
}: StateroomsPriceCardProps) {
  return (
    <div
      data-slot="staterooms-price-card"
      className={cn(
        'flex items-start overflow-hidden rounded-md bg-white py-3 pl-3 shadow-raised',
        className,
      )}
      {...divProps}
    >
      <StateroomsCategorySelection
        {...(selectedCategory && {
          categoryName: selectedCategory.name,
          categoryCode: selectedCategory.code,
          price: selectedCategory.price,
        })}
      />
      <CategoryBand
        columns={columns}
        {...(onItemSelect !== undefined && { onItemSelect })}
        className="flex-1 p-3"
      />
    </div>
  );
}
