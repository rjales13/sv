// @vitest-environment happy-dom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AirCityPricingProvider, CategoryPricingAvailability } from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { ProvidersContext } from '@/app/data/providers-context.tsx';
import { createAppQueryClient } from '@/app/data/query-client.ts';
import { cruiseWorkspaceStore } from '@/store/cruise-workspace.store.ts';
import { stubAirProvider } from '../../test-support/air-pricing-stub.ts';
import { VikingAirTab } from './viking-air-tab.tsx';

const PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'agent-1',
  officeCurrency: 'USD',
  authorizationScopes: ['cruise.search'],
};

const CRUISE = { cruiseId: 'TEST' } as CategoryPricingAvailability;

const INITIAL_STATE = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL_STATE, true);
});

/**
 * Renders the tab inside a minimal router.
 * Pass `hasCabin: true` to seed the store with a stateroom selection for cruise TEST,
 * which is what the tab now reads to gate air controls (tab navigation clears URL params).
 */
async function renderTab({
  hasCabin,
  provider = stubAirProvider(),
}: {
  hasCabin?: boolean;
  provider?: AirCityPricingProvider;
} = {}) {
  if (hasCabin) {
    cruiseWorkspaceStore.getState().selectStateroom('TEST', {
      categoryAbbrev: 'DV',
      cabinNumber: '101',
      deck: 1,
    });
  }
  render(
    <QueryClientProvider client={createAppQueryClient()}>
      <ProvidersContext value={{ airCityPricing: provider }}>
        <MemoryRouter initialEntries={['/cruise/TEST/air']}>
          <Routes>
            <Route
              path="/cruise/:cruiseId"
              element={<Outlet context={{ cruise: CRUISE, principal: PRINCIPAL }} />}
            >
              <Route path="air" element={<VikingAirTab />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>,
  );
  // Fares load through the port now, so every assertion below waits for the payload first.
  await screen.findByTestId('viking-air-tab');
}

describe('VikingAirTab — structure', () => {
  it('renders a card for each guest', async () => {
    await renderTab({ hasCabin: true });
    expect(screen.getByRole('region', { name: 'Guest 1 / Main PAX' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Guest 2' })).toBeInTheDocument();
  });

  it('shows the copy-to-guest-2 checkbox only on the first card', async () => {
    await renderTab({ hasCabin: true });
    expect(
      screen.getByRole('checkbox', { name: 'Use the same information for Guest 2' }),
    ).toBeInTheDocument();
  });

  it('renders gateway comboboxes and class selects for both guests (airfare on by default)', async () => {
    await renderTab({ hasCabin: true });
    // 2 gateway comboboxes per guest × 2 guests = 4 combobox inputs
    // 2 class selects per guest × 2 guests = 4 combobox (Radix Select role)
    // Total comboboxes = 8
    expect(screen.getAllByRole('combobox')).toHaveLength(8);
  });
});

describe('VikingAirTab — cabin category prerequisite (R3)', () => {
  it('shows the warning banner when no cabin category is selected', async () => {
    await renderTab();
    expect(screen.getByTestId('viking-air-cabin-banner')).toBeInTheDocument();
    expect(
      screen.getByText('Please select a Cabin Category in Staterooms to enable Air Selection.'),
    ).toBeInTheDocument();
  });

  it('does not show the banner when a cabin category is selected', async () => {
    await renderTab({ hasCabin: true });
    expect(screen.queryByTestId('viking-air-cabin-banner')).not.toBeInTheDocument();
  });

  it('hides the banner when dismissed', async () => {
    await renderTab();
    expect(screen.getByTestId('viking-air-cabin-banner')).toBeInTheDocument();
    act(() => {
      screen.getByRole('button', { name: 'Dismiss' }).click();
    });
    expect(screen.queryByTestId('viking-air-cabin-banner')).not.toBeInTheDocument();
  });

  it('controls remain disabled after banner is dismissed (no cabin category)', async () => {
    await renderTab();
    act(() => {
      screen.getByRole('button', { name: 'Dismiss' }).click();
    });
    // Include Airfare switches must remain disabled
    for (const sw of screen.getAllByRole('switch', { name: 'Include Airfare' })) {
      expect(sw).toBeDisabled();
    }
  });

  it('disables Include Airfare switches when no cabin category is selected', async () => {
    await renderTab();
    for (const sw of screen.getAllByRole('switch', { name: 'Include Airfare' })) {
      expect(sw).toBeDisabled();
    }
  });
});

describe('VikingAirTab — copy to Guest 2', () => {
  it('Guest 2 inherits Guest 1 airfare-off when copy is checked', async () => {
    await renderTab({ hasCabin: true });

    const [toggle1, toggle2] = screen.getAllByRole('switch', { name: 'Include Airfare' });
    expect(toggle1).toBeDefined();
    expect(toggle2).toBeDefined();

    // Toggle Guest 1 airfare off — with copy on, Guest 2 follows
    act(() => {
      toggle1?.click();
    });

    // Both toggles should now be unchecked
    for (const toggle of screen.getAllByRole('switch', { name: 'Include Airfare' })) {
      expect(toggle).not.toBeChecked();
    }
    // Selects disappear for both guests
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('unchecking copy lets Guest 2 be changed independently', async () => {
    await renderTab({ hasCabin: true });

    const copyCheckbox = screen.getByRole('checkbox', {
      name: 'Use the same information for Guest 2',
    });
    act(() => {
      copyCheckbox.click();
    });

    const [toggle1, toggle2] = screen.getAllByRole('switch', { name: 'Include Airfare' });
    act(() => {
      toggle1?.click();
    });

    // Guest 1 toggled off, Guest 2 unchanged
    expect(toggle1).not.toBeChecked();
    expect(toggle2).toBeChecked();
  });
});

describe('VikingAirTab — flight defaults', () => {
  it('one origin pick on Guest 1 fills both legs, Economy, for both guests', async () => {
    await renderTab({ hasCabin: true });

    const [origin1] = screen.getAllByRole('combobox', { name: 'Origin Gateway' });
    act(() => {
      fireEvent.focus(origin1 as HTMLElement);
    });
    act(() => {
      fireEvent.pointerDown(
        screen.getByRole('option', {
          name: 'New York John F. Kennedy International Airport - JFK',
        }),
      );
    });

    const expected = {
      includeAirfare: true,
      originGateway: 'JFK',
      originClass: 'Q',
      returnGateway: 'JFK',
      returnClass: 'Q',
    };
    const air = cruiseWorkspaceStore.getState().byCruise['TEST']?.air;
    expect(air?.['G1']).toEqual(expected);
    expect(air?.['G2']).toEqual(expected);
  });
});

describe('VikingAirTab — data-testid', () => {
  it('exposes the tab root for integration tests', async () => {
    await renderTab();
    expect(screen.getByTestId('viking-air-tab')).toBeInTheDocument();
  });
});

describe('VikingAirTab — pricing feedback (R5)', () => {
  // The airfare summary must visibly react to a selection change. Pricing is a local lookup,
  // so without an explicit calculating state the total repaints instantly and silently —
  // which is exactly how this regressed once already.
  //
  // Driven through the Include Airfare switch rather than the gateway combobox: the switch
  // routes through the same `priceInto` path and needs no knowledge of the combobox internals.
  function seedCompleteSelection() {
    cruiseWorkspaceStore.getState().setGuestAir('TEST', 'G1', {
      includeAirfare: true,
      originGateway: 'JFK',
      returnGateway: 'JFK',
      originClass: 'D',
      returnClass: 'D',
    });
  }

  it('shows a calculating state before the priced summary settles', async () => {
    seedCompleteSelection();
    await renderTab({ hasCabin: true });

    // The restored selection prices once the payload lands.
    await waitFor(() => expect(screen.getAllByText('$5,198.00').length).toBeGreaterThan(0));

    const [toggle1] = screen.getAllByRole('switch', { name: 'Include Airfare' });
    act(() => toggle1?.click()); // off -> no-air
    act(() => toggle1?.click()); // on  -> calculating, then priced

    // The total is NOT on screen during the calculating window...
    expect(screen.queryAllByText('$5,198.00')).toHaveLength(0);
    // ...and arrives once it settles.
    await waitFor(() => expect(screen.getAllByText('$5,198.00').length).toBeGreaterThan(0));
  });
});
