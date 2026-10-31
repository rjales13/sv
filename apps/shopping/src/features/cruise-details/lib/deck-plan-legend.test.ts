import { describe, expect, it } from 'vitest';
import { readDeckCategories, readDeckLegend, readDeckVenues } from './deck-plan-legend.ts';

/*
  The fixtures below are trimmed from the committed deck plans, keeping the shapes that matter:
  the `<g id="room-…">` wrapper with its fill, the `REF-`/`-2` venue variants, and the
  ship-class suffixes. Real files are ~75KB each, so inlining the relevant structure keeps the
  assertions readable and the failures specific.
*/

const OVS_DECK_3 = `<svg xmlns="http://www.w3.org/2000/svg">
  <g id="room-3000-Ocean-Explorer-Suite-ES3"><rect id="room-3000-Ocean-Explorer-Suite-ES3-2" fill="#f0ccd5"/></g>
  <g id="room-3002-Ocean-Veranda-V1"><rect id="room-3002-Ocean-Veranda-V1-2" fill="#639b91"/><text><tspan>3002</tspan></text></g>
  <g id="room-3003-Ocean-Veranda-V1"><rect id="room-3003-Ocean-Veranda-V1-2" fill="#639b91"/></g>
  <g id="venue-the-atrium-oc"><polygon id="venue-the-atrium-oc-2" fill="#acc2d1"/></g>
</svg>`;

const XPO_DECK_3 = `<svg xmlns="http://www.w3.org/2000/svg">
  <g id="REF-venue-the-bow-xp-polar"><path id="venue-the-bow-xp-polar" fill="#f2f0e8"/></g>
  <g id="venue-shop-xp-polar"><polyline id="venue-shop-xp-polar-2" fill="#acc2d1"/></g>
  <g id="room-3001-VXP-Deluxe-Nordic-Balcony-DN2"><rect id="room-3001-VXP-Deluxe-Nordic-Balcony-DN2-2" fill="#0086a2"/></g>
</svg>`;

describe('readDeckCategories', () => {
  it('names every category drawn on the deck, in the artwork’s own colour', () => {
    expect(readDeckCategories(OVS_DECK_3)).toEqual([
      { label: 'ES3: Explorer Suite', color: '#f0ccd5' },
      { label: 'V1: Veranda', color: '#639b91' },
    ]);
  });

  it('lists a category once however many cabins of it the deck holds', () => {
    // V1 is drawn twice above; a legend that repeated it would be noise.
    const veranda = readDeckCategories(OVS_DECK_3).filter((item) => item.label.startsWith('V1'));
    expect(veranda).toHaveLength(1);
  });

  it('reads the code from the id’s last segment, whatever the name in between', () => {
    // "VXP-Deluxe-Nordic-Balcony-DN2" — four words of name between brand and code.
    expect(readDeckCategories(XPO_DECK_3)).toEqual([
      { label: 'DN2: Deluxe Nordic Balcony', color: '#0086a2' },
    ]);
  });

  it('title-cases names that arrive lower-case', () => {
    // XPO's deck 6 labels its suites in lower case.
    const svg = `<g id="room-6001-VXP-owners-suite-OS"><rect id="x" fill="#b51f3d"/></g>`;
    expect(readDeckCategories(svg)[0]?.label).toBe('OS: Owners Suite');
  });

  it('returns nothing for a deck with no cabins on it', () => {
    // Decks A, 1, 2 and 9 on the Vesta are public rooms only.
    expect(
      readDeckCategories('<svg><g id="venue-the-spa-oc"><path fill="#acc2d1"/></g></svg>'),
    ).toEqual([]);
  });
});

describe('readDeckVenues', () => {
  it('names the venues on the deck and takes each swatch from its own shape', () => {
    expect(readDeckVenues(OVS_DECK_3)).toEqual([{ label: 'The Atrium', color: '#acc2d1' }]);
  });

  it('collapses the REF- wrapper and the -2 inner shape onto one entry', () => {
    const labels = readDeckVenues(XPO_DECK_3).map((item) => item.label);
    expect(labels).toEqual(['Shop', 'The Bow']);
  });

  it('strips the ship-class suffix from every id shape', () => {
    const svg = `<svg>
      <g id="venue-the-spa-oc-xi-class"><path fill="#111111"/></g>
      <g id="venue-the-lounge-rv"><path fill="#222222"/></g>
      <g id="venue-the-aula-xp-polar"><path fill="#333333"/></g>
    </svg>`;
    expect(readDeckVenues(svg).map((item) => item.label)).toEqual([
      'The Aula',
      'The Lounge',
      'The Spa',
    ]);
  });

  it('restores punctuation the slug cannot carry', () => {
    // Rendering these from the slug alone gives "Mamsens" and "World Cafe".
    const svg = `<svg>
      <g id="venue-mamsens-oc"><path fill="#111111"/></g>
      <g id="venue-world-cafe-oc"><path fill="#222222"/></g>
      <g id="venue-manfredis-italian-restaurant-oc-xi-class"><path fill="#333333"/></g>
    </svg>`;
    expect(readDeckVenues(svg).map((item) => item.label)).toEqual([
      "Mamsen's",
      "Manfredi's Italian Restaurant®",
      'World Café',
    ]);
  });
});

describe('readDeckLegend', () => {
  it('shows venues before a category is chosen and categories after (R4.5)', () => {
    expect(readDeckLegend(OVS_DECK_3, false).map((i) => i.label)).toEqual(['The Atrium']);
    expect(readDeckLegend(OVS_DECK_3, true).map((i) => i.label)).toEqual([
      'ES3: Explorer Suite',
      'V1: Veranda',
    ]);
  });

  it('survives a deck whose drawing is missing', () => {
    expect(readDeckLegend('', true)).toEqual([]);
    expect(readDeckLegend('', false)).toEqual([]);
  });
});
