// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { applyFlightSelection, defaultAirClass } from './flight-defaults.ts';
import { CRUISE_ONLY } from './viking-air-pricing.ts';

// Economy-first, as toClassOptions orders them.
const CLASSES = [
  { value: 'Q', label: 'Economy - Q' },
  { value: 'P', label: 'Premium Economy - P' },
  { value: 'D', label: 'Business - D' },
];

describe('defaultAirClass', () => {
  it('picks Economy when the cruise offers it', () => {
    expect(defaultAirClass([...CLASSES].reverse())).toBe('Q');
  });

  it('falls back to the first (cheapest) class when Economy is not offered', () => {
    expect(defaultAirClass(CLASSES.slice(1))).toBe('P');
  });

  it('returns undefined when no class is offered', () => {
    expect(defaultAirClass([])).toBeUndefined();
  });
});

describe('applyFlightSelection — initial defaults', () => {
  it('fills the return leg and Economy on both legs from the first origin pick', () => {
    expect(applyFlightSelection({}, 'originGateway', 'JFK', CLASSES)).toEqual({
      originGateway: 'JFK',
      originClass: 'Q',
      returnGateway: 'JFK',
      returnClass: 'Q',
    });
  });

  it('keeps a class the agent already chose when the origin gateway changes', () => {
    const prev = { originGateway: 'JFK', originClass: 'D', returnGateway: 'JFK', returnClass: 'D' };
    expect(applyFlightSelection(prev, 'originGateway', 'BOS', CLASSES)).toEqual({
      originGateway: 'BOS',
      originClass: 'D',
      returnGateway: 'BOS',
      returnClass: 'D',
    });
  });
});

describe('applyFlightSelection — propagation', () => {
  const synced = { originGateway: 'JFK', originClass: 'Q', returnGateway: 'JFK', returnClass: 'Q' };

  it('carries an origin class change to a return class that still matches', () => {
    expect(applyFlightSelection(synced, 'originClass', 'D', CLASSES)).toEqual({
      ...synced,
      originClass: 'D',
      returnClass: 'D',
    });
  });

  it('carries Cruise Only on the origin to a return leg that still matches', () => {
    expect(applyFlightSelection(synced, 'originGateway', CRUISE_ONLY, CLASSES)).toEqual({
      originGateway: CRUISE_ONLY,
      returnGateway: CRUISE_ONLY,
    });
  });
});

describe('applyFlightSelection — explicit overrides', () => {
  const overridden = {
    originGateway: 'JFK',
    originClass: 'Q',
    returnGateway: 'LAX',
    returnClass: 'D',
  };

  it('stops following the origin once the return gateway and class were changed', () => {
    expect(applyFlightSelection(overridden, 'originGateway', 'BOS', CLASSES)).toEqual({
      ...overridden,
      originGateway: 'BOS',
    });
    expect(applyFlightSelection(overridden, 'originClass', 'P', CLASSES)).toEqual({
      ...overridden,
      originClass: 'P',
    });
  });

  it('leaves an overridden return leg alone when the origin goes Cruise Only', () => {
    expect(applyFlightSelection(overridden, 'originGateway', CRUISE_ONLY, CLASSES)).toEqual({
      originGateway: CRUISE_ONLY,
      returnGateway: 'LAX',
      returnClass: 'D',
    });
  });

  it('records a return-class change without touching the origin', () => {
    const synced = {
      originGateway: 'JFK',
      originClass: 'Q',
      returnGateway: 'JFK',
      returnClass: 'Q',
    };
    expect(applyFlightSelection(synced, 'returnClass', 'D', CLASSES)).toEqual({
      ...synced,
      returnClass: 'D',
    });
  });

  it('defaults the class of a return gateway re-opened from Cruise Only to the origin class', () => {
    const outboundOnly = { originGateway: 'JFK', originClass: 'D', returnGateway: CRUISE_ONLY };
    expect(applyFlightSelection(outboundOnly, 'returnGateway', 'LAX', CLASSES)).toEqual({
      ...outboundOnly,
      returnGateway: 'LAX',
      returnClass: 'D',
    });
  });

  it('clears the return class when the return gateway goes Cruise Only', () => {
    const synced = {
      originGateway: 'JFK',
      originClass: 'Q',
      returnGateway: 'JFK',
      returnClass: 'Q',
    };
    expect(applyFlightSelection(synced, 'returnGateway', CRUISE_ONLY, CLASSES)).toEqual({
      originGateway: 'JFK',
      originClass: 'Q',
      returnGateway: CRUISE_ONLY,
    });
  });

  it('never gives a Cruise Only return leg a class when the origin class changes', () => {
    const outboundOnly = { originGateway: 'JFK', originClass: 'Q', returnGateway: CRUISE_ONLY };
    expect(applyFlightSelection(outboundOnly, 'originClass', 'D', CLASSES)).toEqual({
      ...outboundOnly,
      originClass: 'D',
    });
  });
});
