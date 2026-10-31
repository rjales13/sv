import type { CategoryPricing, CategoryPricingAvailability } from '@vikings/contracts';
import {
  nightsLabel,
  toItinerarySummary,
  tripRoute,
} from '@/features/cruise-details/lib/cruise-header-model.ts';
import type {
  ResultsCardItineraryItem,
  ResultsCardProps,
} from '@/features/search/components/results-card/index.ts';
import type { CardHeaderCategory } from '@/shared/components/card-header/index.ts';
import type {
  CategoryColumnItem,
  CategoryColumnProps,
} from '@/shared/components/category-column/index.ts';
import type { PriceLineStatus } from '@/shared/components/price-line/index.ts';

// FR3.2 client-side sort/filter + FR3.1 card mapping, kept as pure functions so
// the results view stays presentational and this logic is directly unit-tested.
// Sort/filter run over the already-returned set — no new port call — which is the
// FR3.2 pass/fail criterion.

// VCX-10323 puts price-based sorting OUT OF SCOPE and its negative checks assert the absence
// of "price sort or min/max price control", so there is deliberately no price key here. The
// `startingPriceOf` helper stays: the card still prints a "starting at" figure, it just is not
// something the agent can order by.
export type ResultSortKey = 'name' | 'departure' | 'nights';

/** The lowest per-category double-occupancy price — the card's "starting at" figure. */
export function startingPriceOf(result: CategoryPricingAvailability): number {
  if (result.categories.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...result.categories.map((category) => category.doublePrice));
}

const SORT_COMPARATORS: Record<
  ResultSortKey,
  (a: CategoryPricingAvailability, b: CategoryPricingAvailability) => number
> = {
  name: (a, b) => a.cruiseName.localeCompare(b.cruiseName),
  departure: (a, b) => a.sailingDateFrom.localeCompare(b.sailingDateFrom),
  nights: (a, b) => a.nights - b.nights,
};

/** Returns a new array sorted by the chosen key (never mutates the input). */
export function sortResults(
  results: readonly CategoryPricingAvailability[],
  key: ResultSortKey,
): CategoryPricingAvailability[] {
  return [...results].sort(SORT_COMPARATORS[key]);
}

/** Narrows by a case-insensitive substring of the cruise or ship name. Empty query = all. */
export function filterResultsByText(
  results: readonly CategoryPricingAvailability[],
  query: string,
): CategoryPricingAvailability[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...results];
  return results.filter(
    (result) =>
      result.cruiseName.toLowerCase().includes(needle) ||
      result.shipName.toLowerCase().includes(needle),
  );
}

export interface SortAndFilter {
  sort: ResultSortKey;
  query: string;
}

/** Filters first, then sorts the surviving set — the exact order the view applies. */
export function applySortAndFilter(
  results: readonly CategoryPricingAvailability[],
  { sort, query }: SortAndFilter,
): CategoryPricingAvailability[] {
  return sortResults(filterResultsByText(results, query), sort);
}

export function isSoldOut(availabilityStatus: string): boolean {
  return /sold\s*out/i.test(availabilityStatus);
}

/**
 * Filters sold-out sailings when `show` is false (R5: toggle is OFF by default —
 * the agent opts in to see sold-out inventory).
 */
export function filterBySoldOut(
  results: readonly CategoryPricingAvailability[],
  show: boolean,
): CategoryPricingAvailability[] {
  if (show) return [...results];
  return results.filter((r) => !isSoldOut(r.availabilityStatus));
}

/**
 * A category's availability colour — the ONE rule, shared by the search result card and the
 * Staterooms grid so a category never reads green on one screen and red on the other.
 *
 * Two states only: red when the cruise is sold out, the category is closed (EVO status `C`) or
 * has no open cabins; green otherwise. There is deliberately no "running low" orange — an agent
 * reads the open-cabin count beside the price, and a third colour made one cabin left look like
 * a different kind of category from nine.
 */
export function categoryStatus(category: CategoryPricing, cruiseSoldOut = false): PriceLineStatus {
  const closed = category.status.trim().startsWith('C');
  if (cruiseSoldOut || closed || category.openCabinsAvailable <= 0) return 'soldout';
  return 'available';
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const BRAND_TO_CATEGORY: Record<string, CardHeaderCategory> = {
  River: 'rivers',
  Ocean: 'oceans',
  Expedition: 'expeditions',
  Mississippi: 'mississippi',
};

function brandToCategory(brand: string | undefined): CardHeaderCategory {
  return brand !== undefined && brand in BRAND_TO_CATEGORY
    ? (BRAND_TO_CATEGORY[brand] as CardHeaderCategory)
    : 'oceans';
}

/** "9+ remaining" when ≥9, "N remaining" when 1-8, undefined when unknown. */
function formatRemaining(availableToSell: number | undefined): string | undefined {
  if (availableToSell === undefined) return undefined;
  return availableToSell >= 9 ? '9+ remaining' : `${availableToSell} remaining`;
}

/** Unique sorted stateroom group names across all results — drives the FiltersBar options. */
export function stateroomFilterOptions(results: readonly CategoryPricingAvailability[]): string[] {
  const seen = new Set<string>();
  for (const result of results) {
    for (const cat of result.categories) {
      seen.add(categoryGroupName(cat.description));
    }
  }
  return Array.from(seen).sort();
}

/** Narrows results to those containing at least one matching stateroom category. */
export function filterByStateroomType(
  results: readonly CategoryPricingAvailability[],
  stateroomType: string,
): CategoryPricingAvailability[] {
  if (stateroomType === '') return [...results];
  return results.filter((r) =>
    r.categories.some((cat) => categoryGroupName(cat.description) === stateroomType),
  );
}

/**
 * Derives the display name for a category column.
 *
 * EVO `ClassDescription` arrives as "ABBREV-CATEGORY NAME" (e.g. "ES-EXPLORER SUITE").
 * Strip the leading prefix so same-type categories land in one column and the title
 * reads cleanly. Hand-crafted fixture descriptions (e.g. "Explorer Suite") pass through
 * unchanged because they don't match the all-caps-prefix pattern.
 */
export function categoryGroupName(description: string): string {
  const stripped =
    /^[A-Z0-9]{1,4}-(.+)$/.exec(description.trim())?.[1]?.trim() ?? description.trim();
  // Title-case only when the string is fully uppercase (raw EVO format).
  return stripped === stripped.toUpperCase()
    ? stripped.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    : stripped;
}

/**
 * Groups flat category rows by their base category name into pricing columns.
 * "A-VERANDA STATEROOM" and "B-VERANDA STATEROOM" → one "Veranda Stateroom" column.
 * Insertion order is preserved so columns match EVO's price-descending ordering.
 */
function toPricingColumns(categories: CategoryPricing[], soldOut: boolean): CategoryColumnProps[] {
  const columnMap = new Map<string, CategoryColumnItem[]>();
  for (const cat of categories) {
    const groupName = categoryGroupName(cat.description);
    const items = columnMap.get(groupName) ?? [];
    items.push({
      abbrev: cat.abbrev,
      price: formatMoney(cat.doublePrice, cat.currency),
      statA: String(cat.openCabinsAvailable),
      status: categoryStatus(cat, soldOut),
    });
    columnMap.set(groupName, items);
  }
  return Array.from(columnMap.entries()).map(([title, items]) => ({ title, items }));
}

/** Maps a curated per-cruise result onto `ResultsCard` props (FR3.1). */
export function toCruiseCardModel(
  result: CategoryPricingAvailability,
): Omit<ResultsCardProps, 'onCruiseDetails' | 'onSelectChange' | 'selected' | 'className'> {
  const soldOut = isSoldOut(result.availabilityStatus);
  const currency = result.categories[0]?.currency ?? '';
  const min = startingPriceOf(result);

  // Shared with the details header, so a cruise tour shows its hotels on both screens.
  const itinerary: ResultsCardItineraryItem[] = toItinerarySummary(result);

  const formattedAmount = Number.isFinite(min) ? formatMoney(min, currency) : undefined;
  const remaining = formatRemaining(result.availableToSell);
  const lowInventory = result.availableToSell !== undefined && result.availableToSell < 9;

  return {
    category: brandToCategory(result.brand),
    title: result.cruiseName,
    meta: result.marketCode ?? currency,
    ship: result.shipName,
    voyageCode: result.cruiseId,
    soldOut,
    priceLabel: 'Starting at',
    ...(formattedAmount !== undefined && { amount: formattedAmount }),
    ...(currency && { currencyCode: currency }),
    ...tripRoute(result),
    nightsLabel: nightsLabel(result.nights, result.totalNights),
    ...(remaining !== undefined && { remaining, lowInventory }),
    itinerary,
    pricingColumns: toPricingColumns(result.categories, soldOut),
  };
}
