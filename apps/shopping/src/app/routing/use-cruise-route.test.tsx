// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import '../../test-setup.ts';
import { cruiseWorkspaceStore, type WorkspaceState } from '../../store/cruise-workspace.store.ts';
import { useCruiseRoute } from './use-cruise-route.tsx';

// The URL owns WHICH cruise and tab are in view; the store owns the choices made inside
// them (ADR-0012). This hook is the join, and the thing that makes a deep link or a reload
// land the agent where they were.

const INITIAL: WorkspaceState = cruiseWorkspaceStore.getState();

beforeEach(() => {
  cruiseWorkspaceStore.setState(INITIAL, true);
});

function renderAt(path: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cruise/:cruiseId/:tab" element={children} />
      </Routes>
    </MemoryRouter>
  );
  return renderHook(() => useCruiseRoute(), { wrapper });
}

describe('useCruiseRoute', () => {
  it('reads the cruise and tab out of the URL', () => {
    const { result } = renderAt('/cruise/HRJ270426T/extensions');

    expect(result.current.cruiseId).toBe('HRJ270426T');
    expect(result.current.tab).toBe('extensions');
  });

  it('opens the cruise in the workspace, so a deep link populates the tab strip', () => {
    // Arriving cold on a deep link must produce the same workspace as clicking through.
    renderAt('/cruise/HRJ270426T/itinerary');

    expect(cruiseWorkspaceStore.getState().openCruises).toEqual(['HRJ270426T']);
  });

  it('re-opening an already-open cruise does not discard its choices', () => {
    const state = cruiseWorkspaceStore.getState();
    state.openCruise('HRJ270426T');
    state.selectStateroom('HRJ270426T', {
      categoryAbbrev: 'DV2',
      cabinNumber: '6047',
      deck: 6,
    });
    state.openCruise('OSK261007');

    renderAt('/cruise/HRJ270426T/air');

    const after = cruiseWorkspaceStore.getState();
    expect(after.openCruises).toEqual(['HRJ270426T', 'OSK261007']);
    expect(after.byCruise.HRJ270426T?.stateroom?.cabinNumber).toBe('6047');
  });

  it('coerces an unknown tab segment to the default', () => {
    expect(renderAt('/cruise/HRJ270426T/nonsense').result.current.tab).toBe('itinerary');
  });

  it('decodes an encoded cruise id', () => {
    expect(renderAt('/cruise/A%2FB/air').result.current.cruiseId).toBe('A/B');
  });
});
