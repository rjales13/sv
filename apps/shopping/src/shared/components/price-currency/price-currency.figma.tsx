import figma from '@figma/code-connect';
import { PriceCurrency } from './price-currency';

/*
  Code Connect for PriceCurrency (ShoppingApp_UX-VD, node 1781:167043).
  Property 1 (VARIANT): Default | base | total | Comm total | Recalculating | sold
  currency   (BOOLEAN): show/hide currency code → showCurrency prop

  Three connections:
  - Priced variants (default/base/total/comm-total) — amount + currencyCode + showCurrency
  - Recalculating — filtered separately; no amount/currency, Spinner rendered internally
  - Sold — filtered separately; no price props at all
*/

// Default, base, total, comm-total — all show a formatted price.
figma.connect(
  PriceCurrency,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1781-167043',
  {
    props: {
      variant: figma.enum('Property 1', {
        Default: 'default',
        base: 'base',
        total: 'total',
        'Comm total': 'comm-total',
      }),
      showCurrency: figma.boolean('currency'),
    },
    example: ({ variant, showCurrency }) => (
      <PriceCurrency
        variant={variant}
        amount="$4,999.00"
        currencyCode="USD"
        showCurrency={showCurrency}
      />
    ),
  },
);

// Recalculating — price replaced by a Spinner + label; Spinner now has its own
// Code Connect mapping (spinner.figma.tsx), so Dev Mode resolves it inline.
figma.connect(
  PriceCurrency,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1781-167043',
  {
    variant: { 'Property 1': 'Recalculating' },
    example: () => <PriceCurrency variant="recalculating" />,
  },
);

// Sold variant — renders an AvailabilityBadge internally; no price props needed.
figma.connect(
  PriceCurrency,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1781-167043',
  {
    variant: { 'Property 1': 'sold' },
    example: () => <PriceCurrency variant="sold" />,
  },
);
