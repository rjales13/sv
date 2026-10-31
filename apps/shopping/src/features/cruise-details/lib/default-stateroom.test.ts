import type { Cabin, StateroomAvailability } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import { defaultStateroomFor, GUARANTEE_STATEROOM } from './default-stateroom.ts';

function cabin(number: string): Cabin {
  return {
    number,
    deck: '3',
    order: 1,
    hasBalcony: false,
    hasWindow: false,
    hasShower: false,
    hasBath: false,
    hasRefrigerator: false,
    wheelchairAccessible: false,
  };
}

const V1: StateroomAvailability = {
  kind: 'physical',
  cabins: [cabin('3101'), cabin('3102'), cabin('3103')],
};

describe('defaultStateroomFor', () => {
  it('selects the first cabin in the list once the category has no cabin yet', () => {
    expect(defaultStateroomFor(V1, null)).toBe('3101');
  });

  it('keeps a cabin the agent already holds in this category', () => {
    // Returning to the tab, or picking 3103 by hand, must not be dragged back to 3101.
    expect(defaultStateroomFor(V1, '3103')).toBeUndefined();
  });

  it('replaces a cabin left over from the previous category', () => {
    // Switching V1 → V2 clears ?room, but the store still holds V1's cabin. Keeping it would
    // bill V2's fare against a cabin that is not in V2.
    expect(defaultStateroomFor(V1, '5047')).toBe('3101');
  });

  it('selects the guarantee when the category has no physical cabins', () => {
    expect(defaultStateroomFor({ kind: 'guarantee' }, null)).toBe(GUARANTEE_STATEROOM);
    expect(defaultStateroomFor({ kind: 'guarantee' }, GUARANTEE_STATEROOM)).toBeUndefined();
  });

  it('selects nothing while the cabins are still loading', () => {
    expect(defaultStateroomFor(undefined, null)).toBeUndefined();
  });

  it('selects nothing when a physical category returns an empty list', () => {
    expect(defaultStateroomFor({ kind: 'physical', cabins: [] }, null)).toBeUndefined();
  });
});
