import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FiltersBar } from './filters-bar';

/*
  FiltersBar — Search Filters Bar (node 2625:225862, ShoppingApp_UX-VD).

  Each story covers:
    • A11y  — axe runs automatically via @storybook/addon-a11y after play();
              WCAG violations surface in the Accessibility panel.
    • Interaction — play() drives real user events; the Interactions panel
                   shows a step-by-step replay.

  FiltersBar is a fully controlled component — all state is owned by the
  caller. Stories use fn() spies to assert callback contracts; visual
  state does not change after clicks (controlled — prop hasn't changed).
*/

const FILTER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'explorer', label: 'Explorer Suite' },
] as const satisfies ReadonlyArray<{ value: string; label: string }>;

const SORT_OPTIONS = [
  { value: 'embarkationAsc', label: 'Embarkation Date (Ascending)' },
  { value: 'embarkationDesc', label: 'Embarkation Date (Descending)' },
  { value: 'priceAsc', label: 'Price (Low to High)' },
  { value: 'priceDesc', label: 'Price (High to Low)' },
] as const satisfies ReadonlyArray<{ value: string; label: string }>;

const meta = {
  title: 'Shopping/FiltersBar',
  component: FiltersBar,
  parameters: {
    layout: 'padded',
    a11y: {
      config: {
        rules: [
          // DS token values ensure contrast; Radix switch uses aria-checked + role=switch.
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
  args: {
    resultCount: 8,
    filterValue: '',
    filterOptions: FILTER_OPTIONS,
    onFilterChange: fn(),
    showSoldOutCruises: false,
    onShowSoldOutCruisesChange: fn(),
    showSoldOutPackages: false,
    onShowSoldOutPackagesChange: fn(),
    showSoldOutHotels: false,
    onShowSoldOutHotelsChange: fn(),
    sortValue: 'embarkationAsc',
    sortOptions: SORT_OPTIONS,
    onSortChange: fn(),
  },
} satisfies Meta<typeof FiltersBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Default — all sold-out toggles off, no filter selected
// ─────────────────────────────────────────────────────────────────────────────
/** Default — 8 results, all filters at resting state. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Result count headline
    await expect(canvas.getByText('8 Results Found')).toBeInTheDocument();

    // Filter and sort triggers are accessible comboboxes
    await expect(
      canvas.getByRole('combobox', { name: /filter by stateroom type/i }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();

    // Only Sold-Out Cruises is shown, unchecked; its accessible name comes from the visible
    // label text via htmlFor/id. Packages and Hotels are hidden for now (see the bar).
    await expect(canvas.getByRole('switch', { name: /sold-out cruises/i })).not.toBeChecked();
    await expect(canvas.queryByRole('switch', { name: /sold-out packages/i })).toBeNull();
    await expect(canvas.queryByRole('switch', { name: /sold-out hotels/i })).toBeNull();

    // The "Show:" text labels the toggle group
    await expect(canvas.getByRole('group', { name: /show/i })).toBeInTheDocument();

    // Section labels are present
    await expect(canvas.getByText('Filter by:')).toBeInTheDocument();
    await expect(canvas.getByText('Show:')).toBeInTheDocument();
    await expect(canvas.getByText('Sort by:')).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SoldOutVisible — every sold-out flag on; only the Cruises toggle is shown for now
// ─────────────────────────────────────────────────────────────────────────────
/** SoldOutVisible — all sold-out item types are shown in results. */
export const SoldOutVisible: Story = {
  args: {
    showSoldOutCruises: true,
    showSoldOutPackages: true,
    showSoldOutHotels: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Only Sold-Out Cruises is shown; Packages and Hotels are hidden for now (see the bar).
    await expect(canvas.getByRole('switch', { name: /sold-out cruises/i })).toBeChecked();
    await expect(canvas.getAllByRole('switch')).toHaveLength(1);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FilterApplied — a stateroom type filter is already selected
// ─────────────────────────────────────────────────────────────────────────────
/** FilterApplied — shows the combobox with a value pre-selected. */
export const FilterApplied: Story = {
  args: { filterValue: 'deluxe' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Trigger exists and its selected value text is visible
    const trigger = canvas.getByRole('combobox', { name: /filter by stateroom type/i });
    await expect(trigger).toBeInTheDocument();
    await expect(trigger).toHaveTextContent(/deluxe/i);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HighResultCount — result count headline with a larger number
// ─────────────────────────────────────────────────────────────────────────────
/** HighResultCount — headline renders any count passed in. */
export const HighResultCount: Story = {
  args: { resultCount: 247 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('247 Results Found')).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ToggleInteraction — clicking each switch fires the correct callback
// ─────────────────────────────────────────────────────────────────────────────
/** ToggleInteraction — verifies onShowSoldOut* callbacks fire with the correct boolean. */
export const ToggleInteraction: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Cruises switch — starts unchecked; clicking it calls the handler with true
    const cruisesSwitch = canvas.getByRole('switch', { name: /sold-out cruises/i });
    await expect(cruisesSwitch).not.toBeChecked();
    await userEvent.click(cruisesSwitch);
    await expect(args.onShowSoldOutCruisesChange).toHaveBeenCalledOnce();
    await expect(args.onShowSoldOutCruisesChange).toHaveBeenCalledWith(true);

    // Packages and Hotels are hidden for now, so the agent cannot reach them.
    await expect(canvas.queryByRole('switch', { name: /sold-out packages/i })).toBeNull();
    await expect(canvas.queryByRole('switch', { name: /sold-out hotels/i })).toBeNull();

    // Filter and sort callbacks must NOT have fired — user only touched switches
    await expect(args.onFilterChange).not.toHaveBeenCalled();
    await expect(args.onSortChange).not.toHaveBeenCalled();
  },
};
