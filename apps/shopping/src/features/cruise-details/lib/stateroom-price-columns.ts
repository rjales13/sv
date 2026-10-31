import type { CategoryPricing } from '@vikings/contracts';
import { categoryGroupName, categoryStatus } from '@/features/search/lib/results-view-model.ts';
import type { CategoryColumnProps } from '@/shared/components/category-column/category-column.tsx';

// The Staterooms tab's price grid: one column per stateroom type, one row per category.
//
// It shows the same categories as the search result card, and the agent moves between the
// two on a call, so the parts that IDENTIFY a category are shared with it rather than
// re-derived here: the column name (`categoryGroupName`), the availability colour
// (`categoryStatus`), and the badge — which is EVO's own code. It used to be the code plus the
// row's position in its column ("B2" for category B), a code that exists nowhere in EVO.

/** Zero-pads a cabin count to two digits; renders a dash for zero. */
function formatCount(count: number): string {
  return count === 0 ? '–' : String(count).padStart(2, '0');
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
}

/**
 * Groups the categories into price columns, most expensive column first and most expensive
 * category first within each.
 *
 * Sorted on the numeric price, never on the formatted string.
 */
export function toStateroomPriceColumns(
  categories: readonly CategoryPricing[],
  currency: string,
  selectedAbbrev: string | null,
): CategoryColumnProps[] {
  const groups = new Map<string, CategoryPricing[]>();
  for (const category of categories) {
    const name = categoryGroupName(category.description);
    groups.set(name, [...(groups.get(name) ?? []), category]);
  }

  const byPriceDescending = (a: CategoryPricing, b: CategoryPricing) =>
    b.doublePrice - a.doublePrice;

  return [...groups.entries()]
    .map(([title, members]) => ({ title, members: [...members].sort(byPriceDescending) }))
    .sort((a, b) => (b.members[0]?.doublePrice ?? 0) - (a.members[0]?.doublePrice ?? 0))
    .map(({ title, members }) => ({
      title,
      items: members.map((category) => ({
        abbrev: category.abbrev,
        price: formatPrice(category.doublePrice, currency),
        statA: formatCount(category.openCabinsAvailable),
        statB: formatCount(category.gtyCabinsAvailable),
        status: categoryStatus(category),
        selected: category.abbrev === selectedAbbrev,
      })),
    }));
}
