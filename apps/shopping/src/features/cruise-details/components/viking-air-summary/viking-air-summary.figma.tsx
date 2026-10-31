import figma from '@figma/code-connect';
import { VikingAirSummary } from './viking-air-summary.tsx';

/*
  Code Connect for VikingAirSummary — ShoppingApp_UX-VD, node 1519-276836.
  The amounts are text overrides on nested PriceLineItem instances, not
  component properties, so the example carries representative values.
*/

figma.connect(
  VikingAirSummary,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1519-276836',
  {
    props: {
      variant: figma.enum('Property 1', {
        empty: 'empty',
        loading: 'loading',
        'no Air': 'no-air',
        summarized: 'summarized',
      }),
    },
    example: ({ variant }) => (
      <VikingAirSummary
        variant={variant}
        airfare="$9,595.00"
        discount="$700.00"
        total="$8,895.00"
      />
    ),
  },
);
