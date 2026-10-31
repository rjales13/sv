import figma from '@figma/code-connect';
import { CardHeader } from '../card-header/card-header';

/*
  Code Connect for CardHeader (ShoppingApp_UX-VD, node 748:48042).

  Figma models this as 11 flat variants on `Property 1`; the React component
  takes props instead (category / ship / voyageCode / soldOut / priceLabel).
  That means a Figma variant maps to a COMBINATION of props, not a single enum
  value, so the variants are split across connections by JSX shape:

    • base      — the four cruise rows that show a price. Same shape, only the
                  category chip differs, so one `figma.enum` covers all four.
    • filtered  — every row whose shape differs: sold-out rows drop the price
                  block, extension rows drop ship/voyageCode, and the land
                  package drops the price prefix. Code Connect variant filters
                  are exact-match, so each needs its own connection.
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=748-48042';

// ── Cruise rows with a price — ship + voyage code + "Starting at" ────────────
figma.connect(CardHeader, URL, {
  props: {
    category: figma.enum('Property 1', {
      'cruise-default': 'oceans',
      'cruise-river': 'rivers',
      'cruise-expedition': 'expeditions',
      'cruise-mississippi': 'mississippi',
    }),
  },
  example: ({ category }) => (
    <CardHeader
      category={category}
      title="Grand European Tour"
      meta="EUR"
      ship="Viking Shipxxx"
      voyageCode="VIL00000000"
      priceLabel="Starting at"
      amount="$4,999.00"
      currencyCode="USD"
    />
  ),
});

// ── Cruise row, no inventory — price block becomes a SOLD OUT badge ──────────
figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'cruise-sold-out' },
  example: () => (
    <CardHeader
      category="oceans"
      title="Grand European Tour"
      meta="EUR"
      ship="Viking Shipxxx"
      voyageCode="VIL00000000"
      soldOut
    />
  ),
});

// ── Extension rows — no ship/voyage meta; price prefixed by a seat count ─────
figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'ext-pre' },
  example: () => (
    <CardHeader
      category="pre"
      title="Extension Name"
      meta="4 Nights"
      priceLabel="54 Available"
      amount="$4,999.00"
      currencyCode="USD"
    />
  ),
});

figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'ext-prestop' },
  example: () => (
    <CardHeader
      category="pre-stopover"
      title="Extension Name"
      meta="4 Nights"
      priceLabel="54 Available"
      amount="$4,999.00"
      currencyCode="USD"
    />
  ),
});

figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'ext-post' },
  example: () => (
    <CardHeader
      category="post"
      title="Extension Name"
      meta="4 Nights"
      priceLabel="54 Available"
      amount="$4,999.00"
      currencyCode="USD"
    />
  ),
});

figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'ext-poststop' },
  example: () => (
    <CardHeader
      category="post-stopover"
      title="Extension Name"
      meta="4 Nights"
      priceLabel="54 Available"
      amount="$4,999.00"
      currencyCode="USD"
    />
  ),
});

// ── Included land package — price stands alone, no availability prefix ───────
figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'ext-landpackage' },
  example: () => (
    <CardHeader
      category="land-package"
      title="Extension Name"
      meta="4 Nights"
      amount="$4,999.00"
      currencyCode="USD"
    />
  ),
});

// ── Extension row, no inventory ──────────────────────────────────────────────
figma.connect(CardHeader, URL, {
  variant: { 'Property 1': 'ext-sold-out' },
  example: () => <CardHeader category="post" title="Extension Name" meta="4 Nights" soldOut />,
});
