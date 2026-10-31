// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../test-setup.ts';
import type { CategoryPricingAvailability } from '@vikings/contracts';
import type { CruiseChoices } from '@/store/cruise-workspace.store.ts';
import { BuildPanel } from './build-panel.tsx';

const cruise: CategoryPricingAvailability = {
  cruiseId: 'HRJ270426T',
  cruiseName: 'Paris to the Swiss Alps',
  shipName: 'Viking Herja',
  nights: 7,
  sailingDateFrom: '2027-07-01',
  sailingDateTo: '2027-07-12',
  availabilityStatus: 'Available',
  itinerary: {
    fromPort: 'Paris',
    toPort: 'Basel',
    fromPortCode: 'CDG',
    toPortCode: 'BSL',
  },
  categories: [
    {
      categoryClass: 'A',
      abbrev: 'A',
      description: 'Category A',
      currency: 'USD',
      doublePrice: 4999,
      singlePrice: 6999,
      status: 'Available',
      openCabinsAvailable: 5,
      gtyCabinsAvailable: 0,
    },
  ],
};

const emptyChoices: CruiseChoices = {
  extensionIds: [],
  air: {},
  travelProtection: {},
};

describe('BuildPanel — price before and after a cabin is selected', () => {
  it('shows the zero footer until a cabin is selected', () => {
    const { container } = render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    expect(container.querySelector('footer')).toHaveAttribute('data-variant', 'zero');
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
  });

  it('bills the selected cabin once one is held', () => {
    const { container } = render(
      <BuildPanel
        cruise={cruise}
        choices={{
          ...emptyChoices,
          stateroom: { categoryAbbrev: 'A', cabinNumber: '101', deck: 1 },
        }}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    expect(container.querySelector('footer')).toHaveAttribute('data-variant', 'direct-collapsed');
    expect(screen.getByText(/\$9,998\.00/)).toBeInTheDocument();
  });
});

describe('BuildPanel — collapsed state (default)', () => {
  it('renders collapsed by default showing GROSS TOTAL', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    expect(screen.getByText(/gross total/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
  });

  it('renders action buttons in collapsed state', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /save opportunity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save search/i })).toBeInTheDocument();
    // Collapsed build panel: the primary CTA invites a review before it becomes "Book Now".
    expect(screen.getByRole('button', { name: /review booking/i })).toBeInTheDocument();
  });

  it('does not render the expanded breakdown by default', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    expect(
      screen.queryByRole('region', { name: /paris to the swiss alps/i }),
    ).not.toBeInTheDocument();
  });
});

describe('BuildPanel — expanded state', () => {
  it('expands when the BREAKDOWN toggle is clicked', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
    // The expanded section title should now be visible
    expect(screen.getByRole('heading', { name: 'Paris to the Swiss Alps' })).toBeInTheDocument();
  });

  // The cruise-detail tab bar is `sticky z-10`; an un-layered backdrop let it paint on top,
  // leaving the tabs bright and clickable over the dimmed page. jsdom has no layout, so the
  // stacking order is pinned by class: backdrop above z-10 chrome, drawer above the backdrop.
  it('layers the backdrop over sticky page chrome and the drawer over the backdrop', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
    expect(screen.getByTestId('build-panel-backdrop')).toHaveClass('z-40');
    expect(screen.getByTestId('build-panel-drawer')).toHaveClass('z-50');
  });

  it('collapses back when the Collapse button inside the expanded panel is clicked', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={2}
        currency="USD"
        promoCodes={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
    // Click the Collapse button inside BuildPanelExpanded
    fireEvent.click(screen.getByRole('button', { name: /collapse/i }));
    // Heading should be gone again
    expect(
      screen.queryByRole('heading', { name: 'Paris to the Swiss Alps' }),
    ).not.toBeInTheDocument();
  });

  it('shows the cruise name and dates in the expanded header', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={1}
        currency="USD"
        promoCodes={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
    expect(screen.getByRole('heading', { name: 'Paris to the Swiss Alps' })).toBeInTheDocument();
    expect(screen.getByText('01 JUL 2027 (THU)')).toBeInTheDocument();
  });

  it('shows the promo code badge when a promo code is present', () => {
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={1}
        currency="USD"
        promoCodes={['VIKING10']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
    expect(screen.getByText('PROMO CODE: VIKING10')).toBeInTheDocument();
  });

  it('fires onTppChange when the TPP checkbox is toggled', () => {
    const onTppChange = vi.fn();
    render(
      <BuildPanel
        cruise={cruise}
        choices={emptyChoices}
        guests={1}
        currency="USD"
        promoCodes={[]}
        onTppChange={onTppChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
    const checkbox = screen.getByRole('checkbox', {
      name: /Include Travel Protection Plan - TPP for this guest/,
    });
    fireEvent.click(checkbox);
    expect(onTppChange).toHaveBeenCalledWith('guest-0', true);
  });
});
