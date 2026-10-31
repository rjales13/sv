import { Accordion } from '@vikings/ui/components/accordion';
import { cn } from '@vikings/ui/lib/utils';
import { useState } from 'react';
import {
  ItineraryDetail,
  type ItineraryDetailProps,
} from '@/features/cruise-details/components/itinerary-detail';

/*
  ItineraryContainer — the card that stacks a sailing's days (ShoppingApp_UX-VD,
  node 2222:422764).

  The only real logic here is the route spine: the rail threading the day
  bullets. Figma draws it as one fixed rectangle (2222:422765, 2px x 1555px at
  x=35, y=32). That rectangle is a stale artifact, not a spec — it is exact for
  the all-collapsed frame, where it runs the first bullet centre (y=30) to the
  last (y=1586), but the sibling frame 2222:422854 opens one row, grows 166px,
  and the same rectangle then falls ~165px short, stranding the final two
  bullets.

  So the rail is derived instead of ported, from the rule the collapsed frame
  states: FIRST bullet centre to LAST bullet centre. It cannot be one absolutely
  positioned box, because the bottom anchor would need the last row's rendered
  height. Instead each row owns the segment running from its own bullet
  downward, and consecutive segments meet across the gap. No row height is ever
  assumed, so the rail is correct at any itinerary length and cannot go stale
  the way the Figma rectangle did.

  That rule is also why the card owns expansion rather than letting each row
  keep its own: opening the first or last row moves the anchor, so the card has
  to know.

  No Code Connect file: Code Connect requires a top-level COMPONENT or
  COMPONENT_SET node. The frames at 2222:422764 / 2222:422854 were plain frames
  (blocked publish once). Node 3060:33846 was briefly a top-level component and
  published successfully, but was later made a variant of a component set
  (Property 1=Default) — which is equally rejected. Restore once a designer
  promotes the component set itself and provides the parent node id.
*/

/** Distance from a row's top edge to its bullet centre while collapsed: py-2 (8) + 10. */
export const BULLET_CENTRE_CLOSED = 18;
/** Same measure while open — the row's padding grows to p-4, so the bullet drops 8px. */
export const BULLET_CENTRE_OPEN = 26;
/** The card's gap-3. Each segment reaches this far past its row to meet the next. */
const ROW_GAP = 12;

/** One day of the itinerary. Ports repeat within a sailing, so identity is explicit. */
export interface ItineraryContainerStop extends Omit<ItineraryDetailProps, 'value'> {
  id: string;
}

export interface ItineraryContainerProps {
  /** Days top to bottom. */
  stops: ItineraryContainerStop[];
  /** Id of the stop open on first render. Only one may be open at a time. */
  defaultExpandedIds?: string[];
  className?: string;
}

export function ItineraryContainer({
  stops,
  defaultExpandedIds,
  className,
}: ItineraryContainerProps) {
  // The Accordion root owns which days are open; the card mirrors that value
  // because the rail's anchors depend on the first and last row's state.
  const [expandedId, setExpandedId] = useState<string>(() => defaultExpandedIds?.[0] ?? '');
  const openIds = new Set(expandedId ? [expandedId] : []);

  return (
    <Accordion
      type="single"
      collapsible
      value={expandedId}
      onValueChange={setExpandedId}
      data-slot="itinerary-container"
      className={cn(
        'flex w-full flex-col gap-3 overflow-clip rounded-sm bg-surface p-3 shadow-raised',
        className,
      )}
    >
      {stops.map(({ id, ...detail }, index) => {
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
        const isOpen = openIds.has(id);
        const bulletCentre = isOpen ? BULLET_CENTRE_OPEN : BULLET_CENTRE_CLOSED;

        return (
          <div key={id} className="relative">
            {/* A lone stop is both ends of the rail, so there is nothing to join. */}
            {!(isFirst && isLast) && (
              <span
                data-slot="itinerary-container-spine"
                aria-hidden="true"
                className="absolute left-[23px] w-0.5 bg-line"
                style={
                  isLast
                    ? { top: 0, height: bulletCentre }
                    : { top: isFirst ? bulletCentre : 0, bottom: -ROW_GAP }
                }
              />
            )}
            {/* `relative` puts the row in the same paint step as the rail so DOM
                order wins — the rail runs behind the bullets, and behind the
                tinted fill of an open row, exactly as the design draws it. */}
            <ItineraryDetail {...detail} value={id} className={cn('relative', detail.className)} />
          </div>
        );
      })}
    </Accordion>
  );
}
