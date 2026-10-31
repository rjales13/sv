import type { Cabin } from '@vikings/contracts';
import type { DeckEntry } from './ship-reference.ts';

/*
  Resolving "which deck is this cabin on" to a position in the deck selector.

  EVO answers the question directly — every cabin carries a `deck` label, `"3"` on the
  delivered data — so this is a mapping problem, not an inference one. The cabin NUMBER looks
  like it encodes the deck (3101 → deck 3) and does, on the sailings we hold; it is not used,
  because the label is stated and the number is a convention that would fail silently the first
  time a ship numbered differently.

  The deck array is asset-shaped and its labels vary by ship — "Deck 3" on the ocean ships,
  "Middle Deck" on the river ships — so the join runs through `sideviewLayerId` (`deck-03`),
  which is numeric on all three and is the same id the sideview highlights.
*/

/** `deck-03` → 3, `deck-0` → 0. `undefined` when the id carries no number. */
function layerNumber(deck: DeckEntry): number | undefined {
  const digits = /(\d+)$/.exec(deck.sideviewLayerId)?.[1];
  return digits === undefined ? undefined : Number.parseInt(digits, 10);
}

/**
 * The deck-selector index for one of EVO's deck labels.
 *
 * `undefined` when the label is not a number — the Polaris sends `"TBA"` for cabins whose deck
 * is not assigned yet — or when no deck in the array matches. Callers leave the selector where
 * the agent put it in that case, rather than guessing at deck 0.
 */
export function resolveDeckIndex(
  decks: readonly DeckEntry[],
  evoDeckLabel: string,
): number | undefined {
  const wanted = Number.parseInt(evoDeckLabel, 10);
  if (Number.isNaN(wanted)) return undefined;

  const index = decks.findIndex((deck) => layerNumber(deck) === wanted);
  return index === -1 ? undefined : index;
}

/**
 * The deck the agent should be looking at, given what they have selected.
 *
 * A category can span several decks — the Vesta's DV2 runs across 4, 5 and 6 — so the two cases
 * are genuinely different:
 *
 *   · a specific cabin is chosen → that cabin's deck, which is unambiguous
 *   · only a category is chosen  → the deck of the FIRST cabin in EVO's own display order,
 *     which is the row the agent is looking at when the list opens
 *
 * Returns `undefined` when nothing can be resolved, which means "leave the selector alone".
 */
export function deckIndexForSelection(
  decks: readonly DeckEntry[],
  cabins: readonly Cabin[],
  selectedCabinNumber: string | null,
): number | undefined {
  if (cabins.length === 0) return undefined;

  const chosen =
    selectedCabinNumber === null
      ? undefined
      : cabins.find((cabin) => cabin.number === selectedCabinNumber);

  const cabin = chosen ?? cabins[0];
  return cabin === undefined ? undefined : resolveDeckIndex(decks, cabin.deck);
}
