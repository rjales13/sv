import figma from '@figma/code-connect';
import { StateroomsPriceCard } from './staterooms-price-card';

/*
  Code Connect for StateroomsPriceCard (ShoppingApp_UX-VD, node 2564:72660).

  Figma exposes one VARIANT property — `Property 1` with two options:
    Default    → a category is selected; selectedCategory props are present
    unselected → no category chosen yet; selectedCategory is omitted and
                 em-dash placeholders render in the CategorySelection widget

  Column count is data-driven (3–6 columns depending on inventory).
  The `double` / `double-disabled` Group variants (stacked bands) are out
  of scope for this increment and are not mapped here.
*/

const EXAMPLE_COLUMNS = [
  {
    title: 'Owners Suite',
    items: [
      { abbrev: 'OS1', price: '$114,799', statA: '10' },
      { abbrev: 'OS2', price: '$114,799', statA: '10' },
      { abbrev: 'OS3', price: '$114,799', statA: '10' },
    ],
  },
  {
    title: 'Deluxe Veranda',
    items: [
      { abbrev: 'DV1', price: '$9,999', statA: '10' },
      { abbrev: 'DV3', price: '$9,999', statA: '10' },
      { abbrev: 'DV4', price: '$9,999', statA: '10' },
    ],
  },
  {
    title: 'Veranda',
    items: [
      { abbrev: 'V1', price: '$7,499', statA: '8' },
      { abbrev: 'V2', price: '$7,499', statA: '8' },
      { abbrev: 'V3', price: '$7,499', statA: '8' },
    ],
  },
];

// Default — a category has been selected by the agent.
figma.connect(
  StateroomsPriceCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2564-72660',
  {
    variant: { 'Property 1': 'Default' },
    example: () => (
      <StateroomsPriceCard
        selectedCategory={{ name: 'Deluxe Veranda', code: 'DV3', price: '$9,999' }}
        columns={EXAMPLE_COLUMNS}
      />
    ),
  },
);

// unselected — no category chosen yet; selectedCategory is omitted.
figma.connect(
  StateroomsPriceCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2564-72660',
  {
    variant: { 'Property 1': 'unselected' },
    example: () => <StateroomsPriceCard columns={EXAMPLE_COLUMNS} />,
  },
);
