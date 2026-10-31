// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import {
  cruiseWorkspaceStore,
  type WorkspaceState,
} from '../../../store/cruise-workspace.store.ts';
import { WorkspaceTabStrip } from './workspace-tab-strip.tsx';

// VCX-10326. The app's OWN tab strip (39px), distinct from the host's record tab strip (44px)
// sitting directly above it. An agent shops several cruises at once and moves between them
// without losing the choices made in each.

const INITIAL: WorkspaceState = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL, true);
});

/** Surfaces the current path so navigation assertions don't depend on rendered screens. */
function LocationProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceTabStrip />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function openCruise(cruiseId: string, label?: string) {
  const state = cruiseWorkspaceStore.getState();
  state.openCruise(cruiseId);
  if (label !== undefined) state.setCruiseLabel(cruiseId, label);
}

describe('WorkspaceTabStrip', () => {
  it('always shows the pinned Search tab, and never lets it be closed', () => {
    renderAt('/');

    const search = screen.getByRole('group', { name: /Search/ });
    expect(search).toBeInTheDocument();
    expect(within(search).queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('shows one tab per open cruise, labelled with the cruise name', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    openCruise('OSK261007', 'Venice, the Adriatic & Greece');
    renderAt('/cruise/HRJ270426T/itinerary');

    expect(screen.getByText('Paris to the Swiss Alps')).toBeInTheDocument();
    expect(screen.getByText('Venice, the Adriatic & Greece')).toBeInTheDocument();
  });

  it('falls back to the cruise id until the name resolves', () => {
    // A cold deep link opens the tab before any request returns. An unlabelled tab is worse
    // than one showing its code.
    openCruise('HRJ270426T');
    renderAt('/cruise/HRJ270426T/itinerary');

    expect(screen.getByText('HRJ270426T')).toBeInTheDocument();
  });

  it('marks the routed cruise as the active tab', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    openCruise('OSK261007', 'Venice, the Adriatic & Greece');
    renderAt('/cruise/OSK261007/air');

    const active = screen.getByRole('group', { name: /Venice/ });
    expect(active).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('group', { name: /Paris/ })).toHaveAttribute('data-state', 'inactive');
  });

  it('marks Search active while on the search screen', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    renderAt('/');

    expect(screen.getByRole('group', { name: /Search/ })).toHaveAttribute('data-state', 'active');
  });

  it('navigates to a cruise on its first tab when its strip tab is clicked', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    renderAt('/');

    fireEvent.click(screen.getByRole('button', { name: 'Paris to the Swiss Alps' }));

    expect(screen.getByTestId('path')).toHaveTextContent('/cruise/HRJ270426T/itinerary');
  });

  it('returns to search when the Search tab is clicked', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    renderAt('/cruise/HRJ270426T/itinerary');

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('closing a tab removes it and discards that cruise’s choices', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    cruiseWorkspaceStore
      .getState()
      .selectStateroom('HRJ270426T', { categoryAbbrev: 'DV2', cabinNumber: '6047', deck: 6 });
    renderAt('/');

    const tab = screen.getByRole('group', { name: /Paris/ });
    fireEvent.click(within(tab).getByRole('button', { name: /^Close / }));

    const after = cruiseWorkspaceStore.getState();
    expect(after.openCruises).toEqual([]);
    expect(after.byCruise).not.toHaveProperty('HRJ270426T');
  });

  it('gives each close button its own name, so they are distinguishable', () => {
    // Five tabs all announcing "Close session" leave a screen-reader user unable to tell
    // which cruise they are about to discard (WCAG 2.4.6).
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    openCruise('OSK261007', 'Venice, the Adriatic & Greece');
    renderAt('/');

    expect(
      screen.getByRole('button', { name: 'Close Paris to the Swiss Alps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close Venice, the Adriatic & Greece' }),
    ).toBeInTheDocument();
  });

  it('focuses the ADJACENT tab when the active one closes, not the last in the strip', () => {
    // Browser-tab behaviour: the neighbour to the right. Jumping to the end of the strip
    // would move the agent somewhere they were not looking.
    openCruise('A', 'Alpha');
    openCruise('B', 'Bravo');
    openCruise('C', 'Charlie');
    renderAt('/cruise/A/itinerary');

    const tab = screen.getByRole('group', { name: 'Alpha' });
    fireEvent.click(within(tab).getByRole('button', { name: 'Close Alpha' }));

    expect(screen.getByTestId('path')).toHaveTextContent('/cruise/B/itinerary');
  });

  it('falls back to the left neighbour when the LAST tab closes', () => {
    openCruise('A', 'Alpha');
    openCruise('B', 'Bravo');
    renderAt('/cruise/B/itinerary');

    const tab = screen.getByRole('group', { name: 'Bravo' });
    fireEvent.click(within(tab).getByRole('button', { name: 'Close Bravo' }));

    expect(screen.getByTestId('path')).toHaveTextContent('/cruise/A/itinerary');
  });

  it('moves to the remaining cruise when the ACTIVE tab is closed', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    openCruise('OSK261007', 'Venice, the Adriatic & Greece');
    renderAt('/cruise/OSK261007/extensions');

    const tab = screen.getByRole('group', { name: /Venice/ });
    fireEvent.click(within(tab).getByRole('button', { name: /^Close / }));

    // Leaving the agent on a route whose cruise no longer exists would show the empty state.
    expect(screen.getByTestId('path')).toHaveTextContent('/cruise/HRJ270426T/itinerary');
  });

  it('returns to search when the last tab is closed', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    renderAt('/cruise/HRJ270426T/itinerary');

    const tab = screen.getByRole('group', { name: /Paris/ });
    fireEvent.click(within(tab).getByRole('button', { name: /^Close / }));

    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('leaves the route alone when a NON-active tab is closed', () => {
    openCruise('HRJ270426T', 'Paris to the Swiss Alps');
    openCruise('OSK261007', 'Venice, the Adriatic & Greece');
    renderAt('/cruise/OSK261007/extensions');

    const tab = screen.getByRole('group', { name: /Paris/ });
    fireEvent.click(within(tab).getByRole('button', { name: /^Close / }));

    expect(screen.getByTestId('path')).toHaveTextContent('/cruise/OSK261007/extensions');
  });
});
