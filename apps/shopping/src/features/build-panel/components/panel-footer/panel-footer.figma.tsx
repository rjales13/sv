import figma from '@figma/code-connect';
import { PanelFooter } from './panel-footer';

figma.connect(
  PanelFooter,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/SApp_UX-VD?node-id=1619-339423',
  {
    props: {
      variant: figma.enum('property1', {
        TA: 'TA',
        TAcollapsed: 'TA-collapsed',
        direct: 'direct',
        collapsedDirect: 'direct-collapsed',
        recalculating: 'recalculating',
        zero: 'zero',
        disabled: 'disabled',
      }),
    },
    example: ({ variant }) => (
      <PanelFooter
        variant={variant}
        grossTotal="$33,455.00"
        currencyCode="USD"
        commTotal="$4,999.00"
      />
    ),
  },
);
