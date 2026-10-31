import type { StateroomAvailability } from '@vikings/contracts';

/** The one row a guarantee-only category offers: Viking assigns the actual cabin later. */
export const GUARANTEE_STATEROOM = 'GTY';

/**
 * The stateroom to select automatically once a category's cabins arrive, or `undefined` when
 * the current selection should stand.
 *
 * Picking a category selects the first cabin in its list, so the Build Panel prices the
 * category the agent chose rather than sitting at zero. A cabin the agent already holds IN
 * THIS LIST is kept, so returning to the tab or choosing another row is never undone. A held
 * cabin that is not in the list is replaced: it belongs to the previous category, and
 * keeping it would bill this category's fare against a cabin it does not contain.
 */
export function defaultStateroomFor(
  availability: StateroomAvailability | undefined,
  current: string | null,
): string | undefined {
  if (availability === undefined) return undefined;

  const staterooms =
    availability.kind === 'physical'
      ? availability.cabins.map((cabin) => cabin.number)
      : [GUARANTEE_STATEROOM];

  if (current !== null && staterooms.includes(current)) return undefined;
  return staterooms[0];
}
