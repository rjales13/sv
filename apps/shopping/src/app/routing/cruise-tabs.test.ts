import { describe, expect, it } from 'vitest';
import {
  CRUISE_TABS,
  cruiseTabPath,
  DEFAULT_CRUISE_TAB,
  isCruiseTab,
  parseCruiseTab,
} from './cruise-tabs.ts';

describe('cruise tab vocabulary', () => {
  it('matches the order of the approved cruise-details frames', () => {
    // Figma metadata lists Viking Air before Extensions; the RENDERED frames show
    // Extensions third. The frames win — see VCX-10327.
    expect(CRUISE_TABS).toEqual(['itinerary', 'stateroom', 'extensions', 'air']);
  });

  it('opens on the itinerary tab', () => {
    expect(DEFAULT_CRUISE_TAB).toBe('itinerary');
  });

  it('builds a deep link for a cruise and tab', () => {
    expect(cruiseTabPath('HRJ270426T', 'extensions')).toBe('/cruise/HRJ270426T/extensions');
  });

  it('encodes a cruise id so an odd code cannot break the path', () => {
    expect(cruiseTabPath('A/B', 'air')).toBe('/cruise/A%2FB/air');
  });

  it('recognises only the four real tabs', () => {
    expect(isCruiseTab('stateroom')).toBe(true);
    expect(isCruiseTab('staterooms')).toBe(false); // the frame's label, not the slug
    expect(isCruiseTab(undefined)).toBe(false);
  });

  it('falls back to the default rather than 404-ing on a bad tab segment', () => {
    // A stale bookmark or a hand-edited URL should land the agent somewhere useful.
    expect(parseCruiseTab('nonsense')).toBe(DEFAULT_CRUISE_TAB);
    expect(parseCruiseTab('air')).toBe('air');
  });
});
