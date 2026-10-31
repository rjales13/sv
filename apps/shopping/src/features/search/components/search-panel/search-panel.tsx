import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@vikings/ui/components/button';
import { Checkbox } from '@vikings/ui/components/checkbox';
import { Field, FieldError, FieldLabel } from '@vikings/ui/components/field';
import { Icon } from '@vikings/ui/components/icon';
import { Input } from '@vikings/ui/components/input';
import { InputDate } from '@vikings/ui/components/input-date';
import { MultiSelect } from '@vikings/ui/components/multi-select';
import { QuantityStepper } from '@vikings/ui/components/quantity-stepper';
import { RadioGroup, RadioGroupItem } from '@vikings/ui/components/radio-group';
import { SearchBar } from '@vikings/ui/components/search-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vikings/ui/components/select';
import { cn } from '@vikings/ui/lib/utils';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { SearchPanelOptions } from '@/features/search/lib/search-panel-options.ts';
import {
  EMPTY_SEARCH_PANEL_VALUES,
  hasSearchInput,
  MAX_GUESTS,
  MIN_GUESTS,
  NIGHTS_RANGE_MESSAGE,
  pushToDate,
  SearchPanelSchema,
  type SearchPanelValues,
  toIsoDate,
} from '@/features/search/lib/search-panel-schema.ts';
import { NightsInput } from './nights-input.tsx';

/** The form's ISO `yyyy-MM-dd` as a local-midnight `Date`; empty is no date. */
function isoToDate(iso: string): Date | undefined {
  return iso ? new Date(`${iso}T00:00:00`) : undefined;
}

/** Imperative surface, so a control outside the panel can reset it — see `onReset`. */
export interface SearchPanelHandle {
  /** Returns every filter to its default, exactly as the panel's own Reset does. */
  reset: () => void;
}

export interface SearchPanelProps {
  /**
   * When true the panel is always expanded and the "Search by:" radio group
   * (Open Search / Group Contract) is shown above the filters — the Agents-Open
   * and Agents-GroupCrontract Figma variants.
   */
  agentMode?: boolean;
  /** Opens the filter section on first render without requiring a user click. */
  defaultExpanded?: boolean;
  defaultValues?: Partial<SearchPanelValues>;
  /**
   * The lists the controls offer — the CRM's catalogs (VCX-10507), supplied by the owner so the
   * panel stays a form and never fetches. See `toSearchPanelOptions`.
   */
  options: SearchPanelOptions;
  onSearch: (values: SearchPanelValues) => void;
  /**
   * Fired after the filters are returned to their defaults, from EITHER trigger — the
   * panel's own Reset or an outside caller going through the ref.
   *
   * The panel resets its own fields; what a reset means for everything else (dropping the
   * results, say) belongs to the owner, and routing both triggers through one callback is
   * what stops the two Resets on screen from behaving differently.
   */
  onReset?: (() => void) | undefined;
  /** Exposes {@link SearchPanelHandle}. */
  ref?: React.Ref<SearchPanelHandle>;
  className?: string;
}

export function SearchPanel({
  agentMode = false,
  defaultExpanded = false,
  defaultValues,
  options,
  onSearch,
  onReset,
  ref,
  className,
}: SearchPanelProps) {
  'use no memo';

  // Agent mode starts expanded but is still user-togglable.
  const [expanded, setExpanded] = React.useState(agentMode || defaultExpanded);
  const isExpanded = expanded;

  // The panel's own defaults. Memoised so `hasPopulatedFilters` compares against a stable
  // object rather than a fresh one each render.
  const merged: SearchPanelValues = React.useMemo(
    () => ({ ...EMPTY_SEARCH_PANEL_VALUES, ...defaultValues }),
    [defaultValues],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isDirty },
  } = useForm<SearchPanelValues>({
    resolver: zodResolver(SearchPanelSchema),
    defaultValues: merged,
  });

  // VCX-10482 R2: some defaults depend on lists that load after the panel mounts — the default
  // currency comes from the agent's CRM office through the catalogs. useForm reads its defaults
  // once, so a later set is applied here, but only to a form the agent has not touched: their
  // input always wins over a default that arrived late.
  const appliedDefaults = React.useRef(merged);
  React.useEffect(() => {
    if (appliedDefaults.current === merged) return;
    appliedDefaults.current = merged;
    if (!isDirty) reset(merged);
  }, [merged, isDirty, reset]);

  const watched = watch();
  const searchMode = watched.searchMode;

  const isGroupMode = agentMode && searchMode === 'group';

  // VCX-10586 R5–R6: a departed sailing cannot be sold, and To cannot precede From — so the
  // earliest From is today and the earliest To is the current From. Read every render, so the
  // To limit follows From as it moves (R7).
  const today = new Date();
  const earliestTo = isoToDate(watched.sailingDateFrom) ?? today;

  // A refused or corrected nights entry makes the earlier message stale, whichever field moved.
  const changeNights = (onChange: (n: number) => void) => (nights: number) => {
    onChange(nights);
    clearErrors('nightsTo');
  };

  // VCX-10588 R7–R9, R12: SEARCH and RESET start disabled and share one rule — text in the
  // search bar, or a filter off its default. Compared against the panel's OWN defaults, so the
  // prepopulated dates and office currency do not count as agent input.
  const canSearch = hasSearchInput(watched, merged);

  // AC: "Reset returns every filter to its default: Scope All, Products All Products,
  // Guests 2, currency per office, dates to the default window" — which is exactly `merged`,
  // so the sailing window is restored rather than cleared.
  const handleReset = React.useCallback(() => {
    reset(merged);
    onReset?.();
  }, [reset, merged, onReset]);

  // The empty state's "Reset filters" sits outside this component but has to mean the same
  // thing as the Reset inside it. Exposing the one handler keeps them from drifting: before
  // this, that button cleared the RESULTS and left every field populated, so the agent was
  // told the filters had been reset while the form still held the search that found nothing.
  React.useImperativeHandle(ref, () => ({ reset: handleReset }), [handleReset]);

  // A successful search collapses the options so the results list below gets the agent's
  // attention. Only on success: handleSubmit skips this when validation fails, which keeps the
  // panel open with the error in view. Field values survive the collapse (react-hook-form
  // keeps unmounted fields registered), so More Options reopens the search as it was.
  const handleSearch = (values: SearchPanelValues) => {
    // A disabled SEARCH does not stop every way of submitting (Enter in a field, in some
    // browsers), so the rule is held here too.
    if (!hasSearchInput(values, merged)) return;
    setExpanded(false);
    onSearch(values);
  };

  return (
    <form
      aria-label="Cruise search"
      data-testid="search-form"
      onSubmit={handleSubmit(handleSearch)}
      className={cn(
        'flex flex-col gap-4 rounded-md border border-line-subtle bg-surface pt-8 pb-6 px-4 shadow-raised',
        className,
      )}
    >
      {/* ── Row 1: Scope selector + natural-language SearchBar ── */}
      <div className="flex items-center gap-4">
        {/* InputSelect → Select (scope) */}
        <Controller
          control={control}
          name="scope"
          render={({ field }) => (
            <div className="w-36 shrink-0">
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="sp-scope" aria-label="Scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.scopes.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {/* SearchBar */}
        <Controller
          control={control}
          name="naturalLanguageQuery"
          render={({ field }) => (
            <SearchBar
              data-testid="sp-search-bar"
              aria-label="Natural language search"
              // VCX-10323 negative check: "No spell-check suggestions on free-text fields."
              // Browsers default this ON, so it has to be switched off explicitly — and cruise,
              // port and ship names are exactly the vocabulary a dictionary would red-line.
              spellCheck={false}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Search cruises, ports, ships, destinations, hotels, itineraries...   (Pro tip: Use &quot;+&quot; to compose your search with multiple criteria)"
              wrapperClassName="flex-1"
            />
          )}
        />
      </div>

      {/* ── Expanded section: filters (always open in agentMode) ── */}
      {isExpanded && (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          {/* Agent mode: "Search by:" radio group — Agents-Open / Agents-GroupCrontract */}
          {agentMode && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-fjord">Search by:</span>
              <Controller
                control={control}
                name="searchMode"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="open" id="sp-mode-open" size="sm" />
                      <label htmlFor="sp-mode-open" className="text-sm text-ink">
                        Open Search
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="group" id="sp-mode-group" size="sm" />
                      <label htmlFor="sp-mode-group" className="text-sm text-ink">
                        Group Contract
                      </label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>
          )}

          {/* Open Search filters vs Group Contract input */}
          {!isGroupMode ? (
            /* ── Open Search: products column + two filter rows ── */
            <div className="flex items-start gap-4">
              {/* InputCheckbox group — products column with subtle bg box */}
              <div
                className="flex w-36 shrink-0 flex-col gap-4 rounded bg-surface-subtle border border-line px-3 py-2"
                data-testid="sp-products"
              >
                <Controller
                  control={control}
                  name="products"
                  render={({ field }) => {
                    // VCX-10483: All products is the empty selection — the adapter reads `[]` as
                    // "every product" — so it needs no field of its own. While it is on, the
                    // four types show checked but locked (R4); unchecking it lists all four,
                    // still checked, for the agent to narrow (R5). The same search either way.
                    const allChecked = field.value.length === 0;
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="sp-product-all"
                            size="sm"
                            checked={allChecked}
                            onCheckedChange={(next) =>
                              field.onChange(
                                next === true ? [] : options.products.map(({ value }) => value),
                              )
                            }
                          />
                          <label htmlFor="sp-product-all" className="text-sm text-ink">
                            All products
                          </label>
                        </div>
                        {options.products.map((o) => {
                          const id = `sp-product-${o.value}`;
                          return (
                            <div key={o.value} className="flex items-center gap-2">
                              <Checkbox
                                id={id}
                                size="sm"
                                checked={allChecked || field.value.includes(o.value)}
                                disabled={allChecked}
                                // Unchecking the last type empties the list, which IS All products:
                                // the rail is never left with nothing to search.
                                onCheckedChange={(next) =>
                                  field.onChange(
                                    next === true
                                      ? [...field.value, o.value]
                                      : field.value.filter((v) => v !== o.value),
                                  )
                                }
                              />
                              <label htmlFor={id} className="text-sm text-ink">
                                {o.label}
                              </label>
                            </div>
                          );
                        })}
                      </>
                    );
                  }}
                />
              </div>

              {/* Right area: two filter rows stacked */}
              <div className="flex flex-1 flex-col gap-6">
                {/* Filter row 1: From date, To date, From Nights, To Nights, Guests.
                    `flex-wrap` because the row's fixed widths (296+296+144+144+144 plus gaps)
                    need 1312px of viewport, and VCX-10323 asks for a usable 14-inch laptop as
                    well as the half-34-inch target. Wrapping keeps every control reachable
                    instead of clipping Guests and Promo Code off the right edge. */}
                <div className="flex flex-wrap items-end gap-4">
                  {/* InputDate → InputDate (From date) */}
                  <Controller
                    control={control}
                    name="sailingDateFrom"
                    render={({ field }) => (
                      <Field className="w-[296px]">
                        <FieldLabel htmlFor="sp-date-from">From</FieldLabel>
                        <InputDate
                          id="sp-date-from"
                          minDate={today}
                          value={isoToDate(field.value)}
                          onValueChange={(d) => {
                            const iso = d ? toIsoDate(d) : '';
                            field.onChange(iso);
                            // R1: moving From pushes To out two months, still editable.
                            setValue('sailingDateTo', pushToDate(iso), {
                              shouldValidate: true,
                            });
                          }}
                        />
                      </Field>
                    )}
                  />

                  {/* InputDate → InputDate (To date) */}
                  <Controller
                    control={control}
                    name="sailingDateTo"
                    render={({ field }) => (
                      <Field className="w-[296px]">
                        <FieldLabel htmlFor="sp-date-to">To</FieldLabel>
                        <InputDate
                          id="sp-date-to"
                          minDate={earliestTo}
                          value={isoToDate(field.value)}
                          onValueChange={(d) => field.onChange(d ? toIsoDate(d) : '')}
                          invalid={!!errors.sailingDateTo}
                        />
                      </Field>
                    )}
                  />

                  {/* InputText → Input (From Nights) */}
                  <Controller
                    control={control}
                    name="nightsFrom"
                    render={({ field }) => (
                      <Field className="w-36">
                        <FieldLabel htmlFor="sp-nights-from">From (Nights)</FieldLabel>
                        <NightsInput
                          id="sp-nights-from"
                          aria-label="From nights"
                          value={field.value}
                          onValueChange={changeNights(field.onChange)}
                        />
                      </Field>
                    )}
                  />

                  {/* InputText → Input (To Nights) */}
                  <Controller
                    control={control}
                    name="nightsTo"
                    render={({ field }) => (
                      <Field className="w-36">
                        <FieldLabel htmlFor="sp-nights-to">To (Nights)</FieldLabel>
                        <NightsInput
                          id="sp-nights-to"
                          aria-label="To nights"
                          value={field.value}
                          min={watched.nightsFrom}
                          onValueChange={changeNights(field.onChange)}
                          onBelowMin={() =>
                            setError('nightsTo', { type: 'manual', message: NIGHTS_RANGE_MESSAGE })
                          }
                          invalid={!!errors.nightsTo}
                        />
                      </Field>
                    )}
                  />

                  {/* QuantityStepper → QuantityStepper (Guests) */}
                  <Controller
                    control={control}
                    name="guests"
                    render={({ field }) => (
                      <Field className="w-36">
                        <FieldLabel htmlFor="sp-guests">Guests</FieldLabel>
                        <QuantityStepper
                          aria-label="Guests"
                          min={MIN_GUESTS}
                          max={MAX_GUESTS}
                          value={field.value}
                          onValueChange={field.onChange}
                          invalid={!!errors.guests}
                        />
                      </Field>
                    )}
                  />
                </div>

                {/* Inline validation errors for row 1 */}
                {(errors.sailingDateTo ?? errors.nightsTo ?? errors.guests) && (
                  <FieldError errors={[errors.sailingDateTo, errors.nightsTo, errors.guests]} />
                )}

                {/* Filter row 2: Port Cities, Hotel Cities, Currency, Promo Code — wraps for
                    the same reason as row 1. */}
                <div className="flex flex-wrap items-end gap-4">
                  {/* InputSelect → MultiSelect (Port Cities) */}
                  <Controller
                    control={control}
                    name="portCities"
                    render={({ field }) => (
                      <Field className="w-[296px]">
                        <FieldLabel htmlFor="sp-port-cities">Port Cities</FieldLabel>
                        <MultiSelect
                          id="sp-port-cities"
                          aria-label="Port cities"
                          filterable
                          selectAll
                          placeholder="Select Port Cities"
                          options={[...options.portCities]}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </Field>
                    )}
                  />

                  {/* InputSelect → MultiSelect (Hotel Cities) */}
                  <Controller
                    control={control}
                    name="hotelCities"
                    render={({ field }) => (
                      <Field className="w-[296px]">
                        <FieldLabel htmlFor="sp-hotel-cities">Hotel Cities</FieldLabel>
                        <MultiSelect
                          id="sp-hotel-cities"
                          aria-label="Hotel cities"
                          filterable
                          selectAll
                          placeholder="Select Hotel Cities"
                          options={[...options.hotelCities]}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </Field>
                    )}
                  />

                  {/* InputSelect → Select (Currency) */}
                  <Controller
                    control={control}
                    name="currency"
                    render={({ field }) => (
                      <Field className="w-36">
                        <FieldLabel htmlFor="sp-currency">Currency</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="sp-currency" aria-label="Currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.currencies.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  {/* Free text (Promo Code, VCX-10484). One code per leg (R3), so the form's list
                      holds at most the one being typed. */}
                  <Controller
                    control={control}
                    name="promoCodes"
                    render={({ field }) => (
                      <Field className="w-[304px]">
                        <FieldLabel htmlFor="sp-promo">Promo Code</FieldLabel>
                        <Input
                          id="sp-promo"
                          autoComplete="off"
                          placeholder="Enter Promo Code"
                          aria-invalid={!!errors.promoCodes}
                          value={field.value[0] ?? ''}
                          onChange={(event) =>
                            field.onChange(event.target.value === '' ? [] : [event.target.value])
                          }
                        />
                        <FieldError errors={[errors.promoCodes]} />
                      </Field>
                    )}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── Group Contract mode: single contract number input ── */
            /* InputText → Input (Group Contract #) */
            <Controller
              control={control}
              name="groupContractNumber"
              render={({ field }) => (
                <Field className="w-[560px]">
                  <FieldLabel htmlFor="sp-group-contract">Group Contract</FieldLabel>
                  <Input
                    id="sp-group-contract"
                    placeholder="Enter Group Contract #"
                    spellCheck={false}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </Field>
              )}
            />
          )}
        </div>
      )}

      {/* ── Bottom row: More/Less Options + Reset + Search ── */}
      <div className="flex items-center justify-between border-t border-line pt-4">
        {/* Button (Ghost) — expand/collapse toggle */}
        <Button
          type="button"
          variant="ghost"
          size="default"
          data-testid="sp-toggle"
          onClick={() => setExpanded((prev) => !prev)}
          className="gap-2"
        >
          {isExpanded ? 'Less Options' : 'More Options'}
          <Icon
            name={isExpanded ? 'IconNavigationExpandLess16' : 'IconNavigationExpandMore16'}
            size={16}
            tone="current"
          />
        </Button>

        <div className="flex gap-3">
          {/* Button (Danger/Red) — Reset */}
          <Button
            type="button"
            variant="red"
            size="default"
            data-testid="search-reset"
            disabled={!canSearch}
            onClick={handleReset}
          >
            Reset
          </Button>

          {/* Button (Primary) — Search */}
          <Button
            type="submit"
            variant="default"
            size="default"
            data-testid="search-submit"
            disabled={!canSearch}
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
