import figma from '@figma/code-connect';
import { CruiseContextCard } from './context-card';

/*
  Code Connect for CruiseContextCard (ShoppingApp_UX-VD, node 1043:176419).

  Figma's `Property 1` axis bundles two unrelated changes — the itinerary length
  and the colour of the remaining count. The React component splits them into
  `itinerary` (data) and `lowInventory` (an inventory signal), so a variant maps
  to a COMBINATION of props rather than one enum value. Code Connect variant
  filters are exact-match, so each Figma variant gets its own connection, the
  same way card-header.figma.tsx handles its 11 flat variants.
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1043-176419';

// ── Package — sailing bracketed by hotel nights, inventory healthy ───────────
figma.connect(CruiseContextCard, URL, {
  variant: { 'Property 1': 'cruise package' },
  example: () => (
    <CruiseContextCard
      category="rivers"
      title="Paris to the Swiss Alps"
      meta="EUR"
      ship="Viking Herja"
      voyageCode="HRJ270426T"
      from="Paris"
      to="Zürich"
      nightsLabel="7 Cruise Nights / 11 Total Nights"
      remaining="9+ remaining"
      itinerary={[
        { variant: 'hotel', date: '01 JUL 2027 (SAT)', cityCode: 'ZUR', cityName: 'Zürich' },
        { variant: 'departure', date: '01 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
        { variant: 'arrival', date: '01 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
        { variant: 'hotel', date: '01 JUL 2027 (WED)', cityCode: 'PAR', cityName: 'Paris' },
      ]}
    />
  ),
});

// ── Cruise only — sailing segments, low inventory drives the red count ───────
figma.connect(CruiseContextCard, URL, {
  variant: { 'Property 1': 'cruise only' },
  example: () => (
    <CruiseContextCard
      category="rivers"
      title="Paris to the Swiss Alps"
      meta="EUR"
      ship="Viking Herja"
      voyageCode="HRJ270426T"
      from="Paris"
      to="Zürich"
      nightsLabel="7 Cruise Nights / 11 Total Nights"
      remaining="7 remaining"
      lowInventory
      itinerary={[
        { variant: 'departure', date: '01 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
        { variant: 'arrival', date: '01 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
      ]}
    />
  ),
});
