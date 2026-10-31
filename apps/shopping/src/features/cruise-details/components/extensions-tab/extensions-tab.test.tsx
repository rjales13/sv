// @vitest-environment happy-dom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import type {
  CategoryPricingAvailability,
  CruiseExtensionsProvider,
  Extension,
} from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { ProvidersContext } from '@/app/data/providers-context.tsx';
import { createAppQueryClient } from '@/app/data/query-client.ts';
import { cruiseWorkspaceStore } from '@/store/cruise-workspace.store.ts';
import { SAMPLE_EXTENSIONS, stubExtensionsProvider } from '../../test-support/extensions-stub.ts';
import { ExtensionsTab } from './extensions-tab.tsx';

// The tab reads extensions through the typed port (ADR-0016 § 5).
//
// This suite used to assert against invented fixture content — "Rhine Valley Land Package",
// "Best of Venice", "Lake Como Hotel, Como". None of that was Viking's; it was written by
// hand alongside the component. The assertions now describe BEHAVIOUR against a port stub,
// so they survive the data being corrected.

const INITIAL_STATE = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL_STATE, true);
});

const PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'agent-1',
  officeCurrency: 'USD',
  authorizationScopes: ['cruise.search'],
};

/** Minimal cruise. The tab reads cruiseId and categories[0].currency. */
function makeCruise(cruiseId = 'HID270322T'): CategoryPricingAvailability {
  return {
    cruiseId,
    cruiseName: 'Test Cruise',
    shipName: 'VIKING TEST',
    brand: 'River',
    itinerary: { fromPort: 'A', toPort: 'B', fromPortCode: 'A', toPortCode: 'B' },
    sailingDateFrom: '2027-01-01',
    sailingDateTo: '2027-01-08',
    nights: 7,
    availabilityStatus: 'Available',
    availableToSell: 10,
    categories: [
      {
        currency: 'USD',
        abbrev: 'V',
        description: 'Veranda',
        doublePrice: 1000,
        singlePrice: 1500,
        categoryClass: 'V',
        status: 'Available',
        openCabinsAvailable: 10,
        gtyCabinsAvailable: 0,
      },
    ],
  };
}

async function renderTab(provider: CruiseExtensionsProvider = stubExtensionsProvider()) {
  render(
    <QueryClientProvider client={createAppQueryClient()}>
      <ProvidersContext value={{ cruiseExtensions: provider }}>
        <MemoryRouter initialEntries={['/cruise/HID270322T/extensions']}>
          <Routes>
            <Route
              path="/cruise/:cruiseId"
              element={<Outlet context={{ cruise: makeCruise(), principal: PRINCIPAL }} />}
            >
              <Route path="extensions" element={<ExtensionsTab />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>,
  );
  // Extensions load through the port now, so every assertion waits for the payload.
  await screen.findByTestId('extensions-tab');
}

/** The offering with no bundled package — the R4.4 path. */
function withoutLandPackage() {
  const { landPackage: _dropped, ...rest } = SAMPLE_EXTENSIONS;
  return stubExtensionsProvider({ kind: 'ok', offering: rest });
}

describe('ExtensionsTab — FR4 states', () => {
  it('shows a loading state while the port is in flight', () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <ProvidersContext
          value={{ cruiseExtensions: { getExtensions: () => new Promise(() => {}) } }}
        >
          <MemoryRouter initialEntries={['/cruise/HID270322T/extensions']}>
            <Routes>
              <Route
                path="/cruise/:cruiseId"
                element={<Outlet context={{ cruise: makeCruise(), principal: PRINCIPAL }} />}
              >
                <Route path="extensions" element={<ExtensionsTab />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ProvidersContext>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('extensions-tab-loading')).toBeInTheDocument();
  });

  it('shows the empty state for a sailing offering no extensions', async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <ProvidersContext value={{ cruiseExtensions: stubExtensionsProvider({ kind: 'empty' }) }}>
          <MemoryRouter initialEntries={['/cruise/HID270322T/extensions']}>
            <Routes>
              <Route
                path="/cruise/:cruiseId"
                element={<Outlet context={{ cruise: makeCruise(), principal: PRINCIPAL }} />}
              >
                <Route path="extensions" element={<ExtensionsTab />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ProvidersContext>
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId('extensions-tab-empty')).toBeInTheDocument();
  });
});

describe('ExtensionsTab — pricing alert (R3)', () => {
  it('shows the DOUBLE occupancy pricing banner', async () => {
    await renderTab();
    expect(
      screen.getByText('Showing price per person for DOUBLE occupancy in US Dollar (USD).'),
    ).toBeInTheDocument();
  });

  it('is dismissible, and dismissing does not remove the extension cards', async () => {
    await renderTab();
    act(() => {
      screen.getByRole('button', { name: /dismiss/i }).click();
    });
    expect(
      screen.queryByText('Showing price per person for DOUBLE occupancy in US Dollar (USD).'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Milan Extension')).toBeInTheDocument();
  });
});

describe('ExtensionsTab — land package (R4)', () => {
  it('renders the bundled package in its own card', async () => {
    await renderTab();
    const card = screen.getByTestId('extensions-land-package');
    expect(within(card).getByText('Paris to the Swiss Alps')).toBeInTheDocument();
  });

  it('shows "Included" in place of a price', async () => {
    // It is bundled with the fare, so the card must not quote a separate amount.
    await renderTab();
    const card = screen.getByTestId('extensions-land-package');
    expect(within(card).getByText('Included')).toBeInTheDocument();
    expect(within(card).queryByText(/\$1,300/)).not.toBeInTheDocument();
  });

  it('renders each component hotel as a stop', async () => {
    // The package's stays are its `multi: 'Y'` component rows, folded in by the adapter.
    await renderTab();
    const card = screen.getByTestId('extensions-land-package');
    expect(within(card).getByText(/Zurich Hotel/)).toBeInTheDocument();
    expect(within(card).getByText(/Paris Hotel/)).toBeInTheDocument();
  });

  it('shows the "Additional Extensions" heading when a package is present', async () => {
    await renderTab();
    expect(screen.getByText('Additional Extensions')).toBeInTheDocument();
  });

  it('omits the heading when there is no bundled package (R4.4)', async () => {
    await renderTab(withoutLandPackage());
    expect(screen.queryByText('Additional Extensions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('extensions-land-package')).not.toBeInTheDocument();
  });
});

describe('ExtensionsTab — prices come from the port, formatted at the edge', () => {
  it('formats the numeric price and remaining count', async () => {
    // The port carries 1500 and 15; the strings are produced by the view model.
    await renderTab();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText(/15 Available/)).toBeInTheDocument();
  });
});

describe('ExtensionsTab — sold out (R5.4)', () => {
  const soldOut: Extension = {
    ...(SAMPLE_EXTENSIONS.extensions[0] as Extension),
    code: '099',
    title: 'Sold Out Extension',
    soldOut: true,
  };

  it('shows a SOLD OUT indicator and no checkbox', async () => {
    await renderTab(
      stubExtensionsProvider({
        kind: 'ok',
        offering: { ...SAMPLE_EXTENSIONS, extensions: [soldOut] },
      }),
    );
    const card = screen
      .getByText('Sold Out Extension')
      .closest('[data-slot="extensions-card"]') as HTMLElement;
    expect(within(card).getAllByText(/sold out/i).length).toBeGreaterThan(0);
    expect(within(card).queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('ExtensionsTab — selection (R5.5)', () => {
  it('selects several extensions at once', async () => {
    await renderTab(withoutLandPackage());
    const checkboxes = screen.getAllByRole('checkbox');
    act(() => checkboxes[0]?.click());
    act(() => checkboxes[1]?.click());
    const checked = screen
      .getAllByRole('checkbox')
      .filter((cb) => cb.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(2);
  });

  it('unchecking removes the selection', async () => {
    await renderTab(withoutLandPackage());
    const checkbox = screen.getAllByRole('checkbox')[0] as HTMLElement;
    act(() => checkbox.click());
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    act(() => checkbox.click());
    expect(checkbox.getAttribute('aria-checked')).not.toBe('true');
  });

  it('stores the EVO invcode, not the array position', async () => {
    // Position was fragile: reordering the list silently reassigned every selection to a
    // different extension.
    await renderTab(withoutLandPackage());
    act(() => (screen.getAllByRole('checkbox')[0] as HTMLElement).click());
    expect(cruiseWorkspaceStore.getState().byCruise['HID270322T']?.extensionIds).toEqual(['050']);
  });
});

describe('ExtensionsTab — ordering (R5.6)', () => {
  it('renders PRE before POST, in the order the adapter supplied', async () => {
    await renderTab(withoutLandPackage());
    const content = screen.getByTestId('extensions-tab').textContent ?? '';
    expect(content.indexOf('Milan Extension')).toBeLessThan(content.indexOf('Paris Extension'));
  });
});
