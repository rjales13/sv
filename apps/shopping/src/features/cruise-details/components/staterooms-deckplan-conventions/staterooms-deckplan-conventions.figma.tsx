import figma from '@figma/code-connect';
import { StateroomsDeckplanConventions } from './staterooms-deckplan-conventions';

/*
  Code Connect for StateroomsDeckplanConventions (ShoppingApp_UX-VD, node 2566:115978).

  Figma exposes one VARIANT property — `Property 1` with two options:
    2 lines → all 10 venue items; wraps to a second row at 852px container width
    1 line  → first 6 items only; fits on a single row

  In code the line count is data-driven: pass fewer items to get one line.
  The `Property 1` variants below show representative data, not exhaustive enums.

  Colors come from the Figma spec (#a2bacb light steel-blue, #83a4a5 deeper teal)
  and are not mapped to design-system tokens — they are deck-plan category colors.
*/

const LIGHT = '#a2bacb';
const TEAL = '#83a4a5';

const VENUES_2_LINES = [
  { label: 'Fitness Center', color: LIGHT },
  { label: 'Guests Services', color: LIGHT },
  { label: 'Hair Salon', color: LIGHT },
  { label: "Manfredi's Italian Restaurant®", color: TEAL },
  { label: 'Shops', color: LIGHT },
  { label: 'Bar', color: LIGHT },
  { label: "The Chef's Table", color: TEAL },
  { label: 'The Kitchen Table', color: TEAL },
  { label: 'The Living Room', color: LIGHT },
  { label: 'The Nordic Spa', color: LIGHT },
];

// 2 lines — all venues; wraps naturally with flex-wrap.
figma.connect(
  StateroomsDeckplanConventions,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2566-115978',
  {
    variant: { 'Property 1': '2 lines' },
    example: () => <StateroomsDeckplanConventions items={VENUES_2_LINES} />,
  },
);

// 1 line — first six venues only; caller slices the array.
figma.connect(
  StateroomsDeckplanConventions,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2566-115978',
  {
    variant: { 'Property 1': '1 line' },
    example: () => <StateroomsDeckplanConventions items={VENUES_2_LINES.slice(0, 6)} />,
  },
);
