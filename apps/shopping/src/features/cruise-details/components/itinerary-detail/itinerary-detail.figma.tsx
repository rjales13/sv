import figma from '@figma/code-connect';
import { Accordion } from '@vikings/ui/components/accordion';
import { ItineraryDetail } from './itinerary-detail';

/*
  Code Connect for ItineraryDetail (ShoppingApp_UX-VD, node 906:118908).

  Figma's `Property 1` axis crosses three independent things — whether a day
  stamp is present, whether it spans a range, and whether the row is open — so a
  variant maps to a COMBINATION of props rather than one enum value. Code Connect
  variant filters are exact-match, so each variant gets its own connection, the
  same way card-header.figma.tsx handles its 11 flat variants.

  Each example includes the `Accordion` root because the row is an AccordionItem
  and the root owns the open state — the same shell tabs-bar.figma.tsx shows for
  its `Tabs` parent. Open variants are expressed by the root naming the row in
  `defaultValue`, not by a prop on the row.

  The `dateRange` / `dayDateExpand` / `range` / `tags` booleans on the Figma
  component are layer-visibility toggles, not design decisions: they are already
  expressed by the presence of `through`, `day` and `tags`, so they are not
  mapped to props of their own.
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=906-118908';

const DAY = { ordinal: 'DAY 1', date: '01 JUL (MON)' };
const THROUGH = { ordinal: 'DAY 5', date: '05 JUL (MON)' };
const TAGS = ['Board 3:00 PM', 'Overnight', 'Attribute'];
const SUMMARY =
  'Admire iconic landmarks, such as the Eiffel Tower and Arc de Triomphe, or browse the Louvre.';
const OVERVIEW =
  'Arrive and check in to your hotel. Long a hub of French culture and cuisine, Paris is one of the most romantic destinations in the world.';

// ── Expanded — multi-day stop, open on its overview ──────────────────────────
figma.connect(ItineraryDetail, URL, {
  variant: { 'Property 1': 'Expanded' },
  example: () => (
    <Accordion type="multiple" defaultValue={['paris']}>
      <ItineraryDetail
        value="paris"
        day={DAY}
        through={THROUGH}
        port="Paris, France (PAR)"
        variant="hotel"
        label="Paris Hotel"
        tags={TAGS}
        summary={SUMMARY}
        overview={OVERVIEW}
      />
    </Accordion>
  ),
});

// ── Collapsed — the same stop closed ─────────────────────────────────────────
figma.connect(ItineraryDetail, URL, {
  variant: { 'Property 1': 'Collapsed' },
  example: () => (
    <Accordion type="multiple">
      <ItineraryDetail
        value="paris"
        day={DAY}
        through={THROUGH}
        port="Paris, France (PAR)"
        variant="hotel"
        label="Paris Hotel"
        tags={TAGS}
        summary={SUMMARY}
        overview={OVERVIEW}
      />
    </Accordion>
  ),
});

// ── Single day — one stamp, so `through` is omitted ──────────────────────────
figma.connect(ItineraryDetail, URL, {
  variant: { 'Property 1': 'Single day' },
  example: () => (
    <Accordion type="multiple">
      <ItineraryDetail
        value="paris"
        day={DAY}
        port="Paris, France (PAR)"
        variant="hotel"
        label="Paris Hotel"
        tags={TAGS}
        summary={SUMMARY}
        overview={OVERVIEW}
      />
    </Accordion>
  ),
});

// ── singleday-expanded — single-day stop, opened ─────────────────────────────
figma.connect(ItineraryDetail, URL, {
  variant: { 'Property 1': 'singleday-expanded' },
  example: () => (
    <Accordion type="multiple" defaultValue={['paris']}>
      <ItineraryDetail
        value="paris"
        day={DAY}
        port="Paris, France (PAR)"
        variant="hotel"
        label="Paris Hotel"
        tags={TAGS}
        summary={SUMMARY}
        overview={OVERVIEW}
      />
    </Accordion>
  ),
});

// ── Variant4 — continuation stop: no stamp, no chevron, bullet gutter kept ───
figma.connect(ItineraryDetail, URL, {
  variant: { 'Property 1': 'Variant4' },
  example: () => (
    <Accordion type="multiple">
      <ItineraryDetail
        value="paris"
        port="Paris, France (PAR)"
        variant="hotel"
        label="Paris Hotel"
        tags={TAGS}
        summary={SUMMARY}
      />
    </Accordion>
  ),
});
