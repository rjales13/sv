import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vikings/ui/components/select';
import { Switch } from '@vikings/ui/components/switch';
import { cn } from '@vikings/ui/lib/utils';
import { useId } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

export interface FiltersBarProps {
  resultCount: number;
  /** Currently selected stateroom-type filter value. Empty string = no filter. */
  filterValue: string;
  filterOptions: readonly FilterOption[];
  onFilterChange: (value: string) => void;
  showSoldOutCruises: boolean;
  onShowSoldOutCruisesChange: (checked: boolean) => void;
  showSoldOutPackages: boolean;
  onShowSoldOutPackagesChange: (checked: boolean) => void;
  showSoldOutHotels: boolean;
  onShowSoldOutHotelsChange: (checked: boolean) => void;
  sortValue: string;
  sortOptions: readonly FilterOption[];
  onSortChange: (value: string) => void;
  className?: string;
}

export function FiltersBar({
  resultCount,
  filterValue,
  filterOptions,
  onFilterChange,
  showSoldOutCruises,
  onShowSoldOutCruisesChange,
  showSoldOutPackages,
  onShowSoldOutPackagesChange,
  showSoldOutHotels,
  onShowSoldOutHotelsChange,
  sortValue,
  sortOptions,
  onSortChange,
  className,
}: FiltersBarProps) {
  // Radix Switch renders a <button>, which is a labelable element — so each
  // toggle needs a real htmlFor/id pair for the visible text to name it.
  const id = useId();
  const showGroupId = `${id}-show`;
  const cruisesId = `${id}-cruises`;
  const packagesId = `${id}-packages`;
  const hotelsId = `${id}-hotels`;

  return (
    // Figma: flex-col gap-[12px] pb-[12px] — gap-3 and pb-3 are 12px in Tailwind.
    <div className={cn('flex flex-col gap-3 pb-3', className)}>
      {/* label/md token: 13px semibold, leading 1.4. Figma clips with an ellipsis. */}
      <p className="truncate text-label-md font-semibold text-fjord">{resultCount} Results Found</p>

      <div className="flex items-center justify-between">
        {/* Left group: "Filter by:" + "Show:" — Figma gap-[14px] between sub-groups */}
        <div className="flex shrink-0 items-center gap-3.5">
          {/* Filter by: stateroom type — Figma inner gap-[8px] */}
          <div className="flex items-center gap-2">
            {/* label/sm token: 12px semibold, leading 1.2 */}
            <span className="whitespace-nowrap text-label-sm font-semibold text-fjord">
              Filter by:
            </span>
            <Select value={filterValue} onValueChange={onFilterChange}>
              {/* Figma pins this select to 206 px (node 2625:225827) */}
              <SelectTrigger size="sm" aria-label="Filter by stateroom type" className="w-51.5">
                <SelectValue placeholder="Stateroom Type" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show: sold-out visibility toggles — Figma inner gap-[8px], toggles gap-[12px] */}
          <div className="flex items-center gap-2">
            <span
              id={showGroupId}
              className="whitespace-nowrap text-label-sm font-semibold text-fjord"
            >
              Show:
            </span>
            {/* role=group so "Show:" names the whole toggle set for screen readers.
                A <fieldset>/<legend> would be the semantic equivalent, but <legend>
                renders outside normal flow and cannot sit inline to the left of the
                toggles the way this bar's layout requires. */}
            {/* biome-ignore lint/a11y/useSemanticElements: <legend> can't be laid out inline; role=group is semantically equivalent here */}
            <div role="group" aria-labelledby={showGroupId} className="flex items-center gap-3">
              {/* Each toggle item — Figma gap-[8px] between switch and label text */}
              <label htmlFor={cruisesId} className="flex cursor-pointer items-center gap-2">
                <Switch
                  id={cruisesId}
                  size="sm"
                  checked={showSoldOutCruises}
                  onCheckedChange={onShowSoldOutCruisesChange}
                />
                {/* body/sm token: 13px regular, leading 1.5 */}
                <span className="whitespace-nowrap text-body-sm text-ink">Sold-Out Cruises</span>
              </label>
              {/* Sold-Out Packages and Hotels are hidden for now: neither reaches the results
                  filter yet (search-results-view only consumes showSoldOutCruises), so showing
                  them would offer inert controls. Kept mounted and wired — drop `hidden` to
                  bring them back. */}
              <label htmlFor={packagesId} hidden className="flex cursor-pointer items-center gap-2">
                <Switch
                  id={packagesId}
                  size="sm"
                  checked={showSoldOutPackages}
                  onCheckedChange={onShowSoldOutPackagesChange}
                />
                <span className="whitespace-nowrap text-body-sm text-ink">Sold-Out Packages</span>
              </label>
              <label htmlFor={hotelsId} hidden className="flex cursor-pointer items-center gap-2">
                <Switch
                  id={hotelsId}
                  size="sm"
                  checked={showSoldOutHotels}
                  onCheckedChange={onShowSoldOutHotelsChange}
                />
                <span className="whitespace-nowrap text-body-sm text-ink">Sold-Out Hotels</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sort by — Figma gap-[7px] between label and select */}
        <div className="flex shrink-0 items-center gap-1.75">
          <span className="whitespace-nowrap text-label-sm font-semibold text-fjord">Sort by:</span>
          <Select value={sortValue} onValueChange={onSortChange}>
            {/* Figma pins this select to 262 px (node 2625:225842) */}
            <SelectTrigger size="sm" aria-label="Sort by" className="w-65.5">
              <SelectValue placeholder="Embarkation Date (Ascending)" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
