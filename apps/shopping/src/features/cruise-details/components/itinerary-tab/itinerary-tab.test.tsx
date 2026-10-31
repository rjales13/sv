// @vitest-environment happy-dom
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  CategoryPricingAvailability,
  CruiseExtensions,
  CruiseExtensionsProvider,
  VoyageItinerary,
  VoyageItineraryProvider,
  VoyageItineraryResult,
} from '@vikings/contracts';
import type { AuthenticatedPrincipal } from '@vikings/platform';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { ProvidersContext } from '@/app/data/providers-context.tsx';
import { createAppQueryClient } from '@/app/data/query-client.ts';
import { SAMPLE_EXTENSIONS } from '../../test-support/extensions-stub.ts';
import { ItineraryTab } from './itinerary-tab.tsx';

// The tab reads the itinerary through the typed port (ADR-0016 § 5) — so these mount a port
// stub, never an adapter, exactly as the feature code depends on the port and not on
// `@vikings/adapters` (invariant 1).

const PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'agent-1',
  officeCurrency: 'USD',
  authorizationScopes: ['cruise.search'],
};

// HID is one of the three walkable cruises, so it has a committed route-map asset.
const CRUISE = {
  cruiseId: 'HID270322T',
  cruiseName: 'Paris to the Swiss Alps',
} as CategoryPricingAvailability;

const ITINERARY: VoyageItinerary = {
  voyageId: 'HID270322T',
  voyageName: 'Paris to the Swiss Alps',
  ports: [
    {
      code: 'BSL',
      name: 'Basel',
      date: '2027-03-22T00:00:00',
      boardingBeginsTime: '1500',
      schedules: [{ code: 'DK', description: 'DOCK' }],
      description: 'Embark your ship and settle into your stateroom.',
    },
    {
      code: 'KOB',
      name: 'Koblenz',
      date: '2027-03-24T00:00:00',
      schedules: [{ code: 'AR', description: 'ARRIVE', time: '0800' }],
    },
  ],
  hotelStays: [],
};

// A tagged union rather than `VoyageItinerary | { error }`: the curated types are
// `looseObject`s, so they carry an index signature and `'error' in outcome` cannot narrow
// against them.
type StubOutcome =
  | { kind: 'ok'; itinerary: VoyageItinerary }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

function stubProvider(
  outcome: StubOutcome = { kind: 'ok', itinerary: ITINERARY },
): VoyageItineraryProvider {
  return {
    getItinerary: (): Promise<VoyageItineraryResult> => {
      if (outcome.kind === 'empty') return Promise.resolve({ status: 'empty' });
      if (outcome.kind === 'error') {
        return Promise.resolve({ status: 'error', kind: 'upstream', message: outcome.message });
      }
      return Promise.resolve({ status: 'ok', itinerary: outcome.itinerary });
    },
  };
}

/** The land package arrives through the extensions port; a cruise with none gets `empty`. */
function extensionsProvider(offering: CruiseExtensions | undefined): CruiseExtensionsProvider {
  return {
    getExtensions: () =>
      Promise.resolve(offering === undefined ? { status: 'empty' } : { status: 'ok', offering }),
  };
}

function renderTab(
  provider: VoyageItineraryProvider = stubProvider(),
  offering: CruiseExtensions | undefined = undefined,
) {
  render(
    <QueryClientProvider client={createAppQueryClient()}>
      <ProvidersContext
        value={{ voyageItinerary: provider, cruiseExtensions: extensionsProvider(offering) }}
      >
        <MemoryRouter initialEntries={['/cruise/HID270322T/itinerary']}>
          <Routes>
            <Route
              path="/cruise/:cruiseId"
              element={<Outlet context={{ cruise: CRUISE, principal: PRINCIPAL }} />}
            >
              <Route path="itinerary" element={<ItineraryTab />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ProvidersContext>
    </QueryClientProvider>,
  );
}

describe('ItineraryTab — populated', () => {
  it('renders a stop per port call', async () => {
    renderTab();
    // The port name appears twice per row (heading and summary), so count rows by the
    // heading form rather than asserting a single match.
    expect(await screen.findAllByText(/Basel \(BSL\)/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Koblenz \(KOB\)/)).not.toHaveLength(0);
  });

  it('shows the AEM narrative the adapter joined onto the port', async () => {
    renderTab();
    await screen.findAllByText(/Basel \(BSL\)/);
    // Narrative lives in `overview`, which the container mounts only once the row is
    // expanded — that is the point of putting it there (Jira R2).
    const firstRowToggle = screen.getAllByRole('button')[0] as HTMLElement;
    fireEvent.click(firstRowToggle);
    expect(
      screen.getByText('Embark your ship and settle into your stateroom.'),
    ).toBeInTheDocument();
  });

  it('renders the route map as an asset, not through the port', async () => {
    // The map is a JPG resolved at build time (ADR-0016 § 7) — it is present even though the
    // port payload says nothing about it.
    renderTab();
    await screen.findAllByText(/Basel \(BSL\)/);
    expect(screen.getByRole('img', { name: /Route map for/ })).toBeInTheDocument();
  });
});

describe('ItineraryTab — cruise tour hotels', () => {
  it('wraps the sailing with the land-package hotels, numbering days from the trip start', async () => {
    renderTab(
      stubProvider({
        kind: 'ok',
        itinerary: {
          ...ITINERARY,
          cityCopy: { ZRH: { shortDescription: 'See landmarks including the Rathaus.' } },
        },
      }),
      SAMPLE_EXTENSIONS,
    );
    const headings = (await screen.findAllByText(/^[A-Z][a-z]+ \([A-Z]{3}\)$/)).map(
      (el) => el.textContent,
    );
    expect(headings[0]).toBe('Zurich (ZRH)');
    expect(headings.at(-1)).toBe('Paris (PAR)');
    expect(screen.getByText('Zurich Hotel')).toBeInTheDocument();
    expect(screen.getByText('See landmarks including the Rathaus.')).toBeInTheDocument();
    // Two nights in Zurich first, so embarkation in Basel is DAY 3.
    expect(screen.getAllByText('DAY 3').length).toBeGreaterThan(0);
  });

  it('shows the sailing alone for a cruise with no land package', async () => {
    renderTab(stubProvider(), undefined);
    await screen.findAllByText(/Basel \(BSL\)/);
    expect(screen.queryByText(/\(ZRH\)/)).not.toBeInTheDocument();
  });
});

describe('ItineraryTab — FR4 states', () => {
  it('shows a loading state while the port is in flight', () => {
    renderTab(
      // Never resolves, so the pending branch is what renders.
      { getItinerary: () => new Promise(() => {}) },
    );
    expect(screen.getByTestId('itinerary-tab-loading')).toBeInTheDocument();
  });

  it('shows the empty state for a sailing with no itinerary', async () => {
    renderTab(stubProvider({ kind: 'empty' }));
    expect(await screen.findByTestId('itinerary-tab-empty')).toBeInTheDocument();
  });

  it('surfaces a port error rather than rendering an empty itinerary', async () => {
    // An upstream failure and "this sailing has no itinerary" must not look the same — one is
    // a fault to retry, the other is a fact about the cruise.
    renderTab(stubProvider({ kind: 'error', message: 'The voyage itinerary is unavailable.' }));
    expect(await screen.findByTestId('itinerary-tab-error')).toBeInTheDocument();
    expect(screen.queryByTestId('itinerary-tab-empty')).not.toBeInTheDocument();
  });
});
