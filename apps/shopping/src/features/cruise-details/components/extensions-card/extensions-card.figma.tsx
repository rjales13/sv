import figma from '@figma/code-connect';
import { ExtensionsCard } from './extensions-card';

// Figma file: ShoppingApp_UX-VD
// Node: 1786-171951 — COMPONENT_SET "ExtensionsCard"
// Variants: "multi hotel" | "land package" | "single hotel" | "sold-out"

const STOP_EXAMPLE = {
  departure: { date: '12 JUL 2027 (SAT)', cityCode: 'VRN', cityName: 'Verona' },
  arrival: { date: '13 JUL 2027 (SUN)', cityCode: 'VRN', cityName: 'Verona' },
  hotel: { name: 'Long Hotel Name Verona Hotel, Verona', type: 'Pre Hotel', nights: 2 },
};

const BULLETS_EXAMPLE = [
  '3 hotel nights in Milan (as shown or similar)',
  '3 meals: 3 breakfasts (B)',
  '1 included tour: Historic Milan by Foot',
  'Services of a Viking Host',
  'All transfers',
];

figma.connect(
  ExtensionsCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1786-171951',
  {
    variant: { 'Property 1': 'multi hotel' },
    example: () => (
      <ExtensionsCard
        category="pre"
        title="Extension Name"
        meta="4 NIGHTS"
        priceLabel="54 Available"
        amount="$4,999.00"
        currencyCode="USD"
        stops={[STOP_EXAMPLE, STOP_EXAMPLE, STOP_EXAMPLE, STOP_EXAMPLE]}
        descriptionBullets={BULLETS_EXAMPLE}
      />
    ),
  },
);

figma.connect(
  ExtensionsCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1786-171951',
  {
    variant: { 'Property 1': 'single hotel' },
    example: () => (
      <ExtensionsCard
        category="pre"
        title="Extension Name"
        meta="4 NIGHTS"
        priceLabel="54 Available"
        amount="$4,999.00"
        currencyCode="USD"
        stops={[STOP_EXAMPLE]}
        descriptionBullets={BULLETS_EXAMPLE}
      />
    ),
  },
);

figma.connect(
  ExtensionsCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1786-171951',
  {
    variant: { 'Property 1': 'land package' },
    example: () => (
      <ExtensionsCard
        category="land-package"
        title="Extension Name"
        meta="4 NIGHTS"
        included
        stops={[STOP_EXAMPLE, STOP_EXAMPLE, STOP_EXAMPLE, STOP_EXAMPLE]}
        descriptionBullets={BULLETS_EXAMPLE}
      />
    ),
  },
);

figma.connect(
  ExtensionsCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1786-171951',
  {
    variant: { 'Property 1': 'sold-out' },
    example: () => (
      <ExtensionsCard
        category="post"
        title="Extension Name"
        meta="4 NIGHTS"
        soldOut
        stops={[STOP_EXAMPLE]}
        descriptionBullets={BULLETS_EXAMPLE}
      />
    ),
  },
);
