import figma from '@figma/code-connect';
import { PriceLine } from './price-line';

figma.connect(
  PriceLine,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=608-124444',
  {
    props: {
      status: figma.enum('Property 1', {
        Available: 'available',
        Limited: 'limited',
        'Sold out': 'soldout',
        Disabled: 'disabled',
        Selected: 'available',
        hover: 'available',
        'selected-limited': 'limited',
      }),
      selected: figma.enum('Property 1', {
        Selected: true,
        'selected-limited': true,
      }),
    },
    example: ({ status, selected }) => (
      <PriceLine abbrev="DN2" price="$114,799" statA="10" status={status} selected={selected} />
    ),
  },
);
