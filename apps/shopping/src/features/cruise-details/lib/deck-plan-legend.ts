import type { DeckPlanConventionItem } from '../components/staterooms-deckplan-conventions/index.ts';

/*
  The deck-plan legend, derived from the deck plan itself (VCX-10332 R4.5).

  The artwork already carries everything the legend needs, per deck:

    <g id="room-3002-Ocean-Veranda-V1"><rect … fill="#639b91"/>…
    <g id="venue-the-chefs-table-oc-xi-class"><polygon … fill="#8eaeae"/>…

  So membership — which categories and which venues are on THIS deck — is read off the
  displayed SVG rather than hand-maintained beside it. That split matters: the hand-authored
  lists this replaces had drifted badly from the drawings (OVS deck 8's legend claimed Fitness
  Center and Hair Salon; the deck 8 plan draws Explorers' Lounge), and a legend that disagrees
  with the picture above it is worse than no legend.

  Colours come from the artwork too, so a swatch always matches the shape it describes. The
  previous ship-wide category legend invented its own hex values and matched nothing.

  Only the venue VOCABULARY is hand-authored, below — 41 names across three ships. The ids are
  slugs, so a label is recoverable from one except where punctuation was lost ("mamsens"), and
  those few are named explicitly rather than rendered as "Mamsens".
*/

/** Ship-class suffixes on venue ids: `venue-the-spa-oc-xi-class` → `the-spa`. */
const VENUE_ID_SUFFIXES = ['-oc-xi-class', '-xp-polar', '-rv', '-oc'] as const;

/**
 * Venue names whose punctuation or accent cannot survive a slug round-trip.
 *
 * Everything not listed here title-cases cleanly from its slug, so this stays a short list of
 * genuine exceptions rather than a second copy of the vocabulary.
 */
const VENUE_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  mamsens: "Mamsen's",
  'manfredis-italian-restaurant': "Manfredi's Italian Restaurant®",
  'the-chefs-table': "The Chef's Table",
  'explorers-lounge': "Explorers' Lounge",
  'world-cafe': 'World Café',
};

/** `the-nordic-spa` → `The Nordic Spa`. */
function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word.length === 0 ? word : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`))
    .join(' ');
}

/** `explorers suite` → `Explorers Suite`. XPO's deck 6 labels arrive lower-case. */
function toTitleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * A room shape and its fill.
 *
 * Matched as "group id, then the first fill inside it" — rooms are drawn as a `<g>` wrapping a
 * single `<rect>`/`<polygon>` plus the room-number `<text>`, so the first fill is the cabin.
 */
const ROOM_PATTERN =
  /<g id="room-\d+-([^"]+)">\s*<(?:rect|polygon|path|polyline)[^>]*?fill="(#[0-9a-fA-F]{3,6})"/g;

/**
 * Every stateroom category drawn on this deck, in the artwork's own colours.
 *
 * The id encodes `room-<number>-<brand>-<category name>-<CODE>`, e.g.
 * `room-3000-Ocean-Explorer-Suite-ES3`. The brand leads, the code trails, and the name is
 * whatever sits between — which is why this splits on `-` rather than trying to match names.
 *
 * Ordered by code so the legend is stable between renders and between decks.
 */
export function readDeckCategories(svgRaw: string): DeckPlanConventionItem[] {
  const byCode = new Map<string, DeckPlanConventionItem>();

  for (const [, descriptor, color] of svgRaw.matchAll(ROOM_PATTERN)) {
    if (descriptor === undefined || color === undefined) continue;

    const parts = descriptor.split('-');
    const code = parts.at(-1);
    // [brand, ...name, code] — anything shorter carries no name to show.
    if (code === undefined || parts.length < 3) continue;

    const name = toTitleCase(parts.slice(1, -1).join(' '));
    if (!byCode.has(code)) byCode.set(code, { label: `${code}: ${name}`, color });
  }

  return [...byCode.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, item]) => item);
}

/**
 * Venue groups on this deck. `REF-` wrappers and the `-2` inner shapes are the same venue drawn
 * once, so both collapse onto the slug.
 */
const VENUE_PATTERN =
  /<(?:g|path|polygon|polyline|rect)\s+id="(?:REF-)?venue-([a-z0-9-]+?)(?:-2)?"/g;

/** The first fill declared after a given offset — the venue's own shape colour. */
function fillAfter(svgRaw: string, from: number): string | undefined {
  return /fill="(#[0-9a-fA-F]{3,6})"/.exec(svgRaw.slice(from, from + 600))?.[1];
}

/**
 * Every public venue drawn on this deck.
 *
 * Labels come from the id, not from the `<text>` in the drawing: the text is split across
 * `<tspan>`s for line breaks, sometimes sits outside its own group, and duplicates itself
 * through the `-2` shapes — extracting it yields "LibraryLibrary" and "The NordicShop".
 */
export function readDeckVenues(svgRaw: string): DeckPlanConventionItem[] {
  const bySlug = new Map<string, DeckPlanConventionItem>();

  for (const match of svgRaw.matchAll(VENUE_PATTERN)) {
    const raw = match[1];
    if (raw === undefined) continue;

    const suffix = VENUE_ID_SUFFIXES.find((candidate) => raw.endsWith(candidate));
    const slug = suffix === undefined ? raw : raw.slice(0, -suffix.length);
    if (bySlug.has(slug)) continue;

    bySlug.set(slug, {
      label: VENUE_LABEL_OVERRIDES[slug] ?? labelFromSlug(slug),
      color: fillAfter(svgRaw, match.index + match[0].length) ?? '#a2bacb',
    });
  }

  return [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The legend for the deck on screen (R4.5).
 *
 * With a category selected the agent is placing a specific cabin, so the legend names the
 * category codes on this deck; with none selected it names the deck's public venues.
 */
export function readDeckLegend(
  floorplanRaw: string,
  hasCategorySelected: boolean,
): DeckPlanConventionItem[] {
  return hasCategorySelected ? readDeckCategories(floorplanRaw) : readDeckVenues(floorplanRaw);
}
