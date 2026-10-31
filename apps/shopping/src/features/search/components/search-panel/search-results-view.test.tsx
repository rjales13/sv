// @vitest-environment happy-dom
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import type * as React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { createHostShell } from '@vikings/platform';
import { HostShellContext } from '@/app/host/host-shell-context.tsx';
import { CANNED_RESULTS } from '@/features/search/test/search-fixtures.mock.ts';
import { RouterHostShell } from '@/test-support/router-host-shell.tsx';
import { resultsViewStore } from '../../lib/results-view-store.ts';
import { SearchResultsView } from './search-results-view.tsx';

// FR3 (read-only cards + client sort/filter) and FR4 (the four states render
// distinctly with accessible status). The view holds no provider, so sort/filter
// cannot issue a search by construction; the controller test proves the provider
// is not re-called.

// The result card opens a cruise through the host shell, which drives a router — so these
// renders need both in scope. MemoryRouter keeps them free of jsdom history plumbing.
function render(ui: React.ReactElement) {
  return rtlRender(
    <MemoryRouter>
      <RouterHostShell>{ui}</RouterHostShell>
    </MemoryRouter>,
  );
}

// The results-view store is a module singleton (it has to outlive the Search screen), so a
// filter switched in one test would otherwise still be on in the next.
beforeEach(() => {
  resultsViewStore.getState().resetView();
});

describe('SearchResultsView — populated (FR3)', () => {
  it('renders only available sailings by default (sold-out are hidden until toggled — AC1)', () => {
    // CANNED_RESULTS: Rhine Getaway (available), Pharaohs & Pyramids (available),
    // Grand European (Sold Out). The sold-out toggle is OFF by default, so only 2 cards.
    render(<SearchResultsView state="populated" results={CANNED_RESULTS} />);
    expect(screen.getAllByTestId('cruise-card')).toHaveLength(2);
    expect(screen.getByText('Rhine Getaway')).toBeInTheDocument();
    expect(screen.getByText('Pharaohs & Pyramids')).toBeInTheDocument();
    expect(screen.queryByText('Grand European')).not.toBeInTheDocument();
  });

  it('reveals sold-out sailings when the Sold-Out Cruises toggle is switched on (AC1)', () => {
    render(<SearchResultsView state="populated" results={CANNED_RESULTS} />);

    // Before toggle: 2 available cards, no SOLD OUT badge.
    expect(screen.getAllByTestId('cruise-card')).toHaveLength(2);

    fireEvent.click(screen.getByRole('switch', { name: /sold-out cruises/i }));

    // After toggle: all 3 cards, Grand European's SOLD OUT badge visible.
    expect(screen.getAllByTestId('cruise-card')).toHaveLength(3);
    expect(screen.getByText('Grand European')).toBeInTheDocument();
  });

  it('default sort is departure date: earliest sailing leads (FR3.2)', () => {
    render(<SearchResultsView state="populated" results={CANNED_RESULTS} />);
    // Pharaohs & Pyramids departs 2027-01-01, Rhine Getaway 2027-04-01.
    const [first] = screen.getAllByTestId('cruise-card');
    expect(first).toHaveTextContent('Pharaohs & Pyramids');
  });

  it('shows the pricing alert with currency and occupancy context (AC3)', () => {
    render(<SearchResultsView state="populated" results={CANNED_RESULTS} guests={2} />);
    const alert = screen.getByTestId('results-pricing-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('USD');
    expect(screen.getByTestId('results-occupancy')).toHaveTextContent('DOUBLE');
  });

  it('shows SINGLE occupancy in the pricing alert when 1 guest is specified (AC3)', () => {
    render(<SearchResultsView state="populated" results={CANNED_RESULTS} guests={1} />);
    expect(screen.getByTestId('results-occupancy')).toHaveTextContent('SINGLE');
  });
});

describe('SearchResultsView — the four FR4 states render distinctly', () => {
  it('renders the loading state with an accessible busy status', () => {
    render(<SearchResultsView state="loading" results={[]} />);
    const loading = screen.getByTestId('results-loading');
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('cruise-card')).not.toBeInTheDocument();
  });

  // Copy and composition come from the approved `EmptyState` (node 2456:24623): a badge, a
  // headline worded around the customer, supporting copy, and a way out.
  it('renders the empty state', () => {
    render(<SearchResultsView state="empty" results={[]} />);
    expect(screen.getByTestId('results-empty')).toBeInTheDocument();
    expect(screen.getByText(/no cruises match your search/i)).toBeInTheDocument();
  });

  // VCX-10484 AC 1: "no results are returned, AND the agent is told why".
  it('says the promo code is why nothing came back, when it is', () => {
    render(<SearchResultsView state="empty" results={[]} unmatchedPromoCode="NOGDS" />);
    expect(screen.getByTestId('results-empty')).toHaveTextContent(
      /no cruises are available with promo code NOGDS/i,
    );
    expect(screen.getByTestId('results-empty')).toHaveTextContent(/enabled for GDS/i);
  });

  it('offers a way out of the empty state when a reset handler is supplied', () => {
    const onResetFilters = vi.fn();
    render(<SearchResultsView state="empty" results={[]} onResetFilters={onResetFilters} />);
    fireEvent.click(screen.getByTestId('results-reset'));
    expect(onResetFilters).toHaveBeenCalledOnce();
  });

  // Without a handler the button would be a dead control, so it is omitted entirely.
  it('omits the reset control when no handler is supplied', () => {
    render(<SearchResultsView state="empty" results={[]} />);
    expect(screen.queryByTestId('results-reset')).not.toBeInTheDocument();
  });

  it('renders the error state with the supplied accessible message', () => {
    render(
      <SearchResultsView
        state="error"
        results={[]}
        errorMessage="Access to cruise search is denied."
      />,
    );
    const error = screen.getByTestId('results-error');
    expect(error).toHaveTextContent('Access to cruise search is denied.');
    expect(error).toHaveAttribute('role', 'status');
  });

  // The frames put the pre-search placeholder on every screen, as the EmptyState `Icon-text`
  // variant: badge and headline, nothing to widen or clear yet.
  it('renders the idle placeholder as the icon-text empty state', () => {
    render(<SearchResultsView state="idle" results={[]} />);
    const idle = screen.getByTestId('results-idle');
    expect(idle).toHaveAttribute('data-variant', 'icon-text');
    expect(idle).toHaveTextContent('Start a new cruise search');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SearchResultsView — opening a cruise (ADR-0010, VCX-10480)', () => {
  it('asks the host shell to open the cruise, instead of navigating itself', () => {
    const paths: string[] = [];
    const host = createHostShell({ navigate: (path) => paths.push(path) });
    rtlRender(
      <MemoryRouter>
        <HostShellContext value={host}>
          <SearchResultsView state="populated" results={CANNED_RESULTS} />
        </HostShellContext>
      </MemoryRouter>,
    );

    const [firstCard] = screen.getAllByTestId('cruise-card');
    if (firstCard === undefined) throw new Error('expected a result card');
    fireEvent.click(within(firstCard).getByRole('button', { name: /cruise details/i }));

    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^\/cruise\/[^/]+/);
  });
});
