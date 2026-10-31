import figma from '@figma/code-connect';
import { StateroomsDeckplan } from './staterooms-deckplan';

// Figma file: ShoppingApp_UX-VD
// Node: 2569-143470 — COMPONENT_SET "StateroomsDeckplan"
//
// The 4 Figma variants (SKY-Default-DECK1, SKY-deck5, SKY-expanded,
// HERJA-MiddleDeck) differ only in which images are passed — the JSX shape
// is identical for all. Callers supply the correct sideviewSrc and
// floorplanSrc for the active ship/deck.

figma.connect(
  StateroomsDeckplan,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2569-143470',
  {
    example: () => (
      <StateroomsDeckplan
        sideviewSrc="/deck-plans/OVS/sideview.svg"
        floorplanSrc="/deck-plans/OVS/deck-01.svg"
        conventions={[
          { label: 'Fitness Center', color: '#a2bacb' },
          { label: 'Guests Services', color: '#a2bacb' },
          { label: "Manfredi's Italian Restaurant®", color: '#83a4a5' },
        ]}
      />
    ),
  },
);
