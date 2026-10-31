import figma from '@figma/code-connect';
import { ItineraryContainer, type ItineraryContainerStop } from './itinerary-container';

/*
  Code Connect for ItineraryContainer (ShoppingApp_UX-VD, node 3078:205035).

  Figma exposes one VARIANT property — `Property 1` with two options:
    Default     →  full itinerary list, no pagination controls
    pagination  →  same list with a page-selector bar rendered above it

  Both map to the same <ItineraryContainer> in code. The component takes a
  `stops` array and renders all of them; the pagination bar is a separate
  concern external to this component (not yet implemented). A single
  un-filtered connection is the correct representation for now.
*/

const EXAMPLE_STOPS: ItineraryContainerStop[] = [
  {
    id: 'day-1',
    day: { ordinal: 'DAY 1', date: '01 JUL (MON)' },
    through: { ordinal: 'DAY 2', date: '02 JUL (MON)' },
    port: 'Paris, France (PAR)',
    variant: 'hotel',
    label: 'Paris Hotel',
    summary:
      'Admire iconic landmarks, such as the Eiffel Tower and Arc de Triomphe, or browse the Louvre.',
  },
  {
    id: 'day-12',
    day: { ordinal: 'DAY 11', date: '11 JUL (THU)' },
    through: { ordinal: 'DAY 12', date: '12 JUL (MON)' },
    port: 'Zurich, Switzerland (ZRH)',
    variant: 'hotel',
    label: 'Zurich Hotel',
    summary:
      "See landmarks including the Rathaus and the city's many churches; sail the scenic lake.",
  },
];

figma.connect(
  ItineraryContainer,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=3078-205035',
  {
    example: () => <ItineraryContainer stops={EXAMPLE_STOPS} />,
  },
);
