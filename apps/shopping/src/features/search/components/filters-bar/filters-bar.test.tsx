// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { FiltersBar, type FiltersBarProps } from './filters-bar.tsx';

// FiltersBar is presentational and fully controlled — it owns no state, so these
// tests assert two things: what it renders for a given set of props, and which
// callback it requests when the agent operates a control. A controlled toggle
// never flips its own checked state, so "clicking on" asserts the REQUEST
// (handler called with the next value), not a visual change.
//
// The Radix Select dropdowns are only ever rendered closed here, matching the
// harness note in test-setup.ts — their option-picking is covered by the
// Storybook interaction tests, which run in a real browser.

const FILTER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'penthouse', label: 'Penthouse' },
];

const SORT_OPTIONS = [
  { value: 'embarkationAsc', label: 'Embarkation Date (Ascending)' },
  { value: 'priceAsc', label: 'Price (Low to High)' },
];

function renderBar(overrides: Partial<FiltersBarProps> = {}) {
  const props: FiltersBarProps = {
    resultCount: 8,
    filterValue: '',
    filterOptions: FILTER_OPTIONS,
    onFilterChange: vi.fn(),
    showSoldOutCruises: false,
    onShowSoldOutCruisesChange: vi.fn(),
    showSoldOutPackages: false,
    onShowSoldOutPackagesChange: vi.fn(),
    showSoldOutHotels: false,
    onShowSoldOutHotelsChange: vi.fn(),
    sortValue: 'embarkationAsc',
    sortOptions: SORT_OPTIONS,
    onSortChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<FiltersBar {...props} />), props };
}

describe('FiltersBar — result count', () => {
  it('renders the supplied count', () => {
    renderBar({ resultCount: 8 });
    expect(screen.getByText('8 Results Found')).toBeInTheDocument();
  });

  it('renders a zero count rather than hiding the headline', () => {
    renderBar({ resultCount: 0 });
    expect(screen.getByText('0 Results Found')).toBeInTheDocument();
  });
});

/**
 * A hidden-for-now toggle. Its <label> is hidden too, so it has no accessible name and
 * getByRole cannot find it; it is reached by the id the bar gives it instead.
 */
function hiddenSwitch(key: 'packages' | 'hotels'): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[role="switch"][id$="-${key}"]`);
  if (el === null) throw new Error(`the ${key} switch is no longer mounted`);
  return el;
}

describe('FiltersBar — Sold-Out Packages and Hotels are hidden for now', () => {
  // Neither toggle reaches the results filter yet (only Sold-Out Cruises does), so they are
  // hidden rather than shown as inert controls. They stay mounted and wired, ready to show.
  it('shows only the Sold-Out Cruises toggle', () => {
    renderBar();
    expect(screen.getAllByRole('switch').map((s) => s.id)).toHaveLength(1);
    expect(screen.getByRole('switch', { name: 'Sold-Out Cruises' })).toBeVisible();
    expect(screen.queryByRole('switch', { name: 'Sold-Out Packages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Sold-Out Hotels' })).not.toBeInTheDocument();
  });

  it('keeps both toggles mounted and wired, so showing them again is a one-line change', () => {
    renderBar();
    expect(hiddenSwitch('packages')).not.toBeVisible();
    expect(hiddenSwitch('hotels')).not.toBeVisible();
  });
});

describe('FiltersBar — sold-out toggles reflect their props', () => {
  it('renders all three switches unchecked when every flag is false', () => {
    renderBar();
    expect(screen.getByRole('switch', { name: 'Sold-Out Cruises' })).not.toBeChecked();
    expect(hiddenSwitch('packages')).not.toBeChecked();
    expect(hiddenSwitch('hotels')).not.toBeChecked();
  });

  it('renders each switch checked independently', () => {
    renderBar({ showSoldOutPackages: true });
    expect(screen.getByRole('switch', { name: 'Sold-Out Cruises' })).not.toBeChecked();
    expect(hiddenSwitch('packages')).toBeChecked();
    expect(hiddenSwitch('hotels')).not.toBeChecked();
  });
});

describe('FiltersBar — toggling requests the next value', () => {
  it('requests true when an unchecked toggle is clicked', () => {
    const { props } = renderBar({ showSoldOutCruises: false });

    fireEvent.click(screen.getByRole('switch', { name: 'Sold-Out Cruises' }));

    expect(props.onShowSoldOutCruisesChange).toHaveBeenCalledOnce();
    expect(props.onShowSoldOutCruisesChange).toHaveBeenCalledWith(true);
  });

  // The inverse direction is the one a controlled component gets wrong most
  // easily — a hardcoded `true` would pass the test above and fail this one.
  it('requests false when an already-checked toggle is clicked', () => {
    const { props } = renderBar({ showSoldOutHotels: true });

    fireEvent.click(hiddenSwitch('hotels'));

    expect(props.onShowSoldOutHotelsChange).toHaveBeenCalledWith(false);
  });

  it('leaves the switch visually unchanged, because the parent owns the state', () => {
    const { props } = renderBar({ showSoldOutCruises: false });
    const cruises = screen.getByRole('switch', { name: 'Sold-Out Cruises' });

    fireEvent.click(cruises);

    expect(props.onShowSoldOutCruisesChange).toHaveBeenCalledWith(true);
    expect(cruises).not.toBeChecked();
  });

  it('wires each toggle to its own handler', () => {
    const { props } = renderBar();

    fireEvent.click(hiddenSwitch('packages'));

    expect(props.onShowSoldOutPackagesChange).toHaveBeenCalledOnce();
    expect(props.onShowSoldOutCruisesChange).not.toHaveBeenCalled();
    expect(props.onShowSoldOutHotelsChange).not.toHaveBeenCalled();
    expect(props.onFilterChange).not.toHaveBeenCalled();
    expect(props.onSortChange).not.toHaveBeenCalled();
  });
});

describe('FiltersBar — accessibility wiring', () => {
  // Each switch is a Radix <button>, so it is named by an explicit
  // htmlFor/id pair rather than by wrapping. Querying by the VISIBLE text
  // proves that association survives: a broken pair leaves the switch unnamed.
  it('names each switch with its visible label text', () => {
    renderBar();
    expect(screen.getByRole('switch', { name: 'Sold-Out Cruises' })).toBeInTheDocument();
    expect(hiddenSwitch('packages')).toBeInTheDocument();
    expect(hiddenSwitch('hotels')).toBeInTheDocument();
  });

  it('groups the toggles under the "Show:" label', () => {
    renderBar();
    expect(screen.getByRole('group', { name: 'Show:' })).toBeInTheDocument();
  });

  it('gives both selects an accessible name', () => {
    renderBar();
    expect(screen.getByRole('combobox', { name: 'Filter by stateroom type' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeInTheDocument();
  });

  // useId, not hardcoded strings — two bars on one page must not cross-wire,
  // which would make a click on one bar's label operate the other's switch.
  it('generates unique control ids per instance', () => {
    const { container: first } = render(
      <FiltersBar
        resultCount={1}
        filterValue=""
        filterOptions={FILTER_OPTIONS}
        onFilterChange={vi.fn()}
        showSoldOutCruises={false}
        onShowSoldOutCruisesChange={vi.fn()}
        showSoldOutPackages={false}
        onShowSoldOutPackagesChange={vi.fn()}
        showSoldOutHotels={false}
        onShowSoldOutHotelsChange={vi.fn()}
        sortValue="embarkationAsc"
        sortOptions={SORT_OPTIONS}
        onSortChange={vi.fn()}
      />,
    );
    const { container: second } = renderBar();

    const idsOf = (root: HTMLElement) =>
      [...root.querySelectorAll('[role="switch"]')].map((el) => el.id);

    const firstIds = idsOf(first);
    const secondIds = idsOf(second);

    expect(firstIds).toHaveLength(3);
    expect(firstIds.every(Boolean)).toBe(true);
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });
});

describe('FiltersBar — selects render closed', () => {
  it('shows the placeholder when no filter is selected', () => {
    renderBar({ filterValue: '' });
    expect(screen.getByRole('combobox', { name: 'Filter by stateroom type' })).toHaveTextContent(
      'Stateroom Type',
    );
  });

  it('renders without options supplied', () => {
    renderBar({ filterOptions: [], sortOptions: [] });
    expect(screen.getByRole('combobox', { name: 'Filter by stateroom type' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeInTheDocument();
  });

  it('renders the section labels', () => {
    renderBar();
    expect(screen.getByText('Filter by:')).toBeInTheDocument();
    expect(screen.getByText('Show:')).toBeInTheDocument();
    expect(screen.getByText('Sort by:')).toBeInTheDocument();
  });
});
