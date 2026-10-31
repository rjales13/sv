// Ship reference data for the three prototype-walkable cruises (ADR-0011, ADR-0014).
//
// ASSETS ONLY — cabins moved behind `StateroomAvailabilityProvider` (ADR-0016 § 7). What
// remains is keyed by SHIP rather than by sailing and is purely asset-shaped: which deck-plan
// drawing belongs to which deck, and which band in the sideview it highlights. Putting an SVG
// URL behind an async port would be boundary theatre, so this stays synchronous and outside
// the provider boundary — the same call § 7 makes for the itinerary route maps.
//
// The venue and category LEGENDS used to live here as hand-authored lists per deck. They are
// gone: the drawings already name and colour every room and venue they contain, so the legend
// is derived from the deck on screen (`deck-plan-legend.ts`). The lists had drifted — OVS deck
// 8's legend claimed Fitness Center and Hair Salon while its plan draws Explorers' Lounge —
// and a legend that contradicts the picture above it is worse than none.
//
// Deck-plan SVGs are imported via import.meta.glob so Vite resolves them at build time,
// avoiding publicDir — the context/ tree sits outside apps/shopping/public/. Raw SVG text is
// imported alongside the URLs so the deckplan panel can inline and highlight the active deck
// layer without a network round-trip.

// Eagerly import all deck-plan SVGs as resolved asset URLs.
const DECK_PLAN_URLS = import.meta.glob(
  '../../../../../../context/mock-data/prototype-cruises/deck-plans/**/*.svg',
  { eager: true, as: 'url' },
) as Record<string, string>;

// Raw SVG text, for inline rendering with layer control.
//
// The `as: 'raw'` option is valid at runtime in Vite 7 but absent from the glob type union
// this program resolves, so the options object is cast. `query: '?raw'` + `import: 'default'`
// is the modern spelling and was tried first — it does not typecheck here either, so the
// cast stays until the vite/client types are wired into the app's program.
const DECK_PLAN_RAWS = import.meta.glob(
  '../../../../../../context/mock-data/prototype-cruises/deck-plans/**/*.svg',
  { eager: true, as: 'raw' } as unknown as { eager: true; as: 'url' },
) as Record<string, string>;

/** Resolve a deck-plan SVG path to its Vite asset URL. */
function deckUrl(ship: string, file: string): string {
  const key = `../../../../../../context/mock-data/prototype-cruises/deck-plans/${ship}/${file}`;
  return DECK_PLAN_URLS[key] ?? '';
}

/** Resolve a deck-plan SVG path to its raw text content. */
function deckRaw(ship: string, file: string): string {
  const key = `../../../../../../context/mock-data/prototype-cruises/deck-plans/${ship}/${file}`;
  return DECK_PLAN_RAWS[key] ?? '';
}

export interface DeckEntry {
  label: string;
  floorplanSrc: string;
  /**
   * Raw SVG text of the deck plan.
   *
   * Inlined rather than served through `<img>` so the drawing's own layers are addressable:
   * the legend is derived from it per deck (see `deck-plan-legend.ts`), which is what keeps
   * the swatches below the plan describing the shapes actually drawn on it.
   */
  floorplanRaw: string;
  /** SVG element id of the deck band in the sideview, e.g. 'deck-01'. Used to highlight the active deck. */
  sideviewLayerId: string;
}

export interface ShipReference {
  sideviewSrc: string;
  /** Raw SVG text of the sideview — used to inline and highlight the active deck layer. */
  sideviewRaw: string;
  decks: DeckEntry[];
}

const SHIP_REFERENCE: Record<string, ShipReference> = {
  OVS270325C: {
    sideviewSrc: deckUrl('OVS', 'sideview.svg'),
    sideviewRaw: deckRaw('OVS', 'sideview.svg'),
    decks: [
      {
        label: 'Deck A',
        floorplanSrc: deckUrl('OVS', 'deck-a.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-a.svg'),
        sideviewLayerId: 'deck-0',
      },
      {
        label: 'Deck 1',
        floorplanSrc: deckUrl('OVS', 'deck-01.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-01.svg'),
        sideviewLayerId: 'deck-01',
      },
      {
        label: 'Deck 2',
        floorplanSrc: deckUrl('OVS', 'deck-02.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-02.svg'),
        sideviewLayerId: 'deck-02',
      },
      {
        label: 'Deck 3',
        floorplanSrc: deckUrl('OVS', 'deck-03.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-03.svg'),
        sideviewLayerId: 'deck-03',
      },
      {
        label: 'Deck 4',
        floorplanSrc: deckUrl('OVS', 'deck-04.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-04.svg'),
        sideviewLayerId: 'deck-04',
      },
      {
        label: 'Deck 5',
        floorplanSrc: deckUrl('OVS', 'deck-05.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-05.svg'),
        sideviewLayerId: 'deck-05',
      },
      {
        label: 'Deck 6',
        floorplanSrc: deckUrl('OVS', 'deck-06.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-06.svg'),
        sideviewLayerId: 'deck-06',
      },
      {
        label: 'Deck 7',
        floorplanSrc: deckUrl('OVS', 'deck-07.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-07.svg'),
        sideviewLayerId: 'deck-07',
      },
      {
        label: 'Deck 8',
        floorplanSrc: deckUrl('OVS', 'deck-08.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-08.svg'),
        sideviewLayerId: 'deck-08',
      },
      {
        label: 'Deck 9',
        floorplanSrc: deckUrl('OVS', 'deck-09.svg'),
        floorplanRaw: deckRaw('OVS', 'deck-09.svg'),
        sideviewLayerId: 'deck-09',
      },
    ],
  },
  HID270322T: {
    sideviewSrc: deckUrl('HID', 'sideview.svg'),
    sideviewRaw: deckRaw('HID', 'sideview.svg'),
    decks: [
      {
        label: 'Main Deck',
        floorplanSrc: deckUrl('HID', 'main-deck.svg'),
        floorplanRaw: deckRaw('HID', 'main-deck.svg'),
        sideviewLayerId: 'deck-01',
      },
      {
        label: 'Middle Deck',
        floorplanSrc: deckUrl('HID', 'middle-deck.svg'),
        floorplanRaw: deckRaw('HID', 'middle-deck.svg'),
        sideviewLayerId: 'deck-02',
      },
      {
        label: 'Upper Deck',
        floorplanSrc: deckUrl('HID', 'upper-deck.svg'),
        floorplanRaw: deckRaw('HID', 'upper-deck.svg'),
        sideviewLayerId: 'deck-03',
      },
      {
        label: 'Sun Deck',
        floorplanSrc: deckUrl('HID', 'sun-deck.svg'),
        floorplanRaw: deckRaw('HID', 'sun-deck.svg'),
        sideviewLayerId: 'deck-04',
      },
    ],
  },
  XPO271113T: {
    sideviewSrc: deckUrl('XPO', 'sideview.svg'),
    sideviewRaw: deckRaw('XPO', 'sideview.svg'),
    decks: [
      {
        label: 'Deck A',
        floorplanSrc: deckUrl('XPO', 'deck-a.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-a.svg'),
        sideviewLayerId: 'deck-0',
      },
      {
        label: 'Deck 1',
        floorplanSrc: deckUrl('XPO', 'deck-01.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-01.svg'),
        sideviewLayerId: 'deck-01',
      },
      {
        label: 'Deck 2',
        floorplanSrc: deckUrl('XPO', 'deck-02.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-02.svg'),
        sideviewLayerId: 'deck-02',
      },
      {
        label: 'Deck 3',
        floorplanSrc: deckUrl('XPO', 'deck-03.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-03.svg'),
        sideviewLayerId: 'deck-03',
      },
      {
        label: 'Deck 4',
        floorplanSrc: deckUrl('XPO', 'deck-04.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-04.svg'),
        sideviewLayerId: 'deck-04',
      },
      {
        label: 'Deck 5',
        floorplanSrc: deckUrl('XPO', 'deck-05.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-05.svg'),
        sideviewLayerId: 'deck-05',
      },
      {
        label: 'Deck 6',
        floorplanSrc: deckUrl('XPO', 'deck-06.svg'),
        floorplanRaw: deckRaw('XPO', 'deck-06.svg'),
        sideviewLayerId: 'deck-06',
      },
    ],
  },
};

/** Deck plans for a cruise's ship, or `undefined` when the prototype has none. */
export function getShipReference(cruiseId: string): ShipReference | undefined {
  return SHIP_REFERENCE[cruiseId];
}
