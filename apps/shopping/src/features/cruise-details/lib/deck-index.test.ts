import type { Cabin } from '@vikings/contracts';
import { describe, expect, it } from 'vitest';
import { deckIndexForSelection, resolveDeckIndex } from './deck-index.ts';
import type { DeckEntry } from './ship-reference.ts';

function deck(label: string, sideviewLayerId: string): DeckEntry {
  return { label, sideviewLayerId, floorplanSrc: '', floorplanRaw: '' };
}

/** The Vesta: a lower deck A, then 1–9. */
const OCEAN_DECKS = [
  deck('Deck A', 'deck-0'),
  deck('Deck 1', 'deck-01'),
  deck('Deck 2', 'deck-02'),
  deck('Deck 3', 'deck-03'),
  deck('Deck 4', 'deck-04'),
];

/** The Hild: named decks, so the join cannot go through the label. */
const RIVER_DECKS = [
  deck('Main Deck', 'deck-01'),
  deck('Middle Deck', 'deck-02'),
  deck('Upper Deck', 'deck-03'),
  deck('Sun Deck', 'deck-04'),
];

function cabin(number: string, deckLabel: string): Cabin {
  return {
    number,
    deck: deckLabel,
    order: 1,
    hasBalcony: false,
    hasWindow: false,
    hasShower: false,
    hasBath: false,
    hasRefrigerator: false,
    wheelchairAccessible: false,
  };
}

describe('resolveDeckIndex', () => {
  it('maps EVO’s deck label onto the matching deck', () => {
    // V1's cabins say deck "3", and Deck 3 is the fourth entry because deck A leads the list.
    expect(resolveDeckIndex(OCEAN_DECKS, '3')).toBe(3);
    expect(resolveDeckIndex(OCEAN_DECKS, '0')).toBe(0);
  });

  it('joins through the layer id, not the deck name', () => {
    // "Middle Deck" contains no number; EVO still calls it deck 2.
    expect(resolveDeckIndex(RIVER_DECKS, '2')).toBe(1);
    expect(resolveDeckIndex(RIVER_DECKS, '3')).toBe(2);
  });

  it('declines a label that is not a deck number', () => {
    // The Polaris sends "TBA" for cabins whose deck is not assigned yet.
    expect(resolveDeckIndex(OCEAN_DECKS, 'TBA')).toBeUndefined();
    expect(resolveDeckIndex(OCEAN_DECKS, '')).toBeUndefined();
  });

  it('declines a deck the ship does not have', () => {
    expect(resolveDeckIndex(RIVER_DECKS, '9')).toBeUndefined();
  });
});

describe('deckIndexForSelection', () => {
  it('follows the cabin the agent picked', () => {
    // DV2 spans decks 4, 5 and 6 — only the chosen cabin says which one to show.
    const cabins = [cabin('4201', '4'), cabin('5201', '5'), cabin('6201', '6')];
    expect(deckIndexForSelection(OCEAN_DECKS, cabins, '5201')).toBe(
      resolveDeckIndex(OCEAN_DECKS, '5'),
    );
  });

  it('falls back to the first cabin when only a category is chosen', () => {
    // The list opens on its first row, so that is the deck to show.
    const cabins = [cabin('3101', '3'), cabin('4101', '4')];
    expect(deckIndexForSelection(OCEAN_DECKS, cabins, null)).toBe(3);
  });

  it('falls back to the first cabin when the selection is not in this list', () => {
    // Category changed but the old ?room= is still in the URL for a frame.
    const cabins = [cabin('3101', '3')];
    expect(deckIndexForSelection(OCEAN_DECKS, cabins, '9999')).toBe(3);
  });

  it('leaves the selector alone when there is nothing to resolve', () => {
    expect(deckIndexForSelection(OCEAN_DECKS, [], null)).toBeUndefined();
    expect(deckIndexForSelection(OCEAN_DECKS, [cabin('GTY', 'TBA')], null)).toBeUndefined();
  });
});
