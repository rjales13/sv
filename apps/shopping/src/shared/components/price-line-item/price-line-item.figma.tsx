import figma from '@figma/code-connect';
import { PriceLineItem } from './price-line-item.tsx';

/*
  Code Connect for PriceLineItem
  Figma: ShoppingApp_UX-VD, node 1515-276009

  Figma variant → code variant mapping:
    Property 1 = "list"         → variant="list"
    Property 1 = "list-N/A"    → variant="list-na"
    Property 1 = "discount"    → variant="discount"
    Property 1 = "subtotal"    → variant="subtotal"
    Property 1 = "Total"       → variant="total"
    Property 1 = "Grand Total" → variant="grand-total"
    Property 1 = "title"       → variant="comm-header"
    Property 1 = "Comm-list"   → variant="comm-list"
    Property 1 = "Comm-list-N/A" → variant="comm-list-na"
    Property 1 = "Comm-Discount" → variant="comm-discount"
    Property 1 = "Comm-subtotal" → variant="comm-subtotal"
    Property 1 = "Comm-total"  → variant="comm-total"
*/

figma.connect(
  PriceLineItem,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1515-276009',
  {
    props: {
      variant: figma.enum('Property 1', {
        list: 'list',
        'list-N/A': 'list-na',
        discount: 'discount',
        subtotal: 'subtotal',
        Total: 'total',
        'Grand Total': 'grand-total',
        title: 'comm-header',
        'Comm-list': 'comm-list',
        'Comm-list-N/A': 'comm-list-na',
        'Comm-Discount': 'comm-discount',
        'Comm-subtotal': 'comm-subtotal',
        'Comm-total': 'comm-total',
      }),
    },
    example: ({ variant }) => (
      <PriceLineItem
        variant={variant}
        label="Originating Gateway Air Add On"
        amount="$1,000.00"
        fare="$10,000.00"
        commPercent="20%"
        commission="$100,000.00"
      />
    ),
  },
);
