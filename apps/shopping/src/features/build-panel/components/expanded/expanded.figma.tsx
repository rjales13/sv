import figma from '@figma/code-connect';
import { BuildPanelExpanded } from './expanded.tsx';

/*
  Code Connect for BuildPanelExpanded — SApp_UX-VD, BuildPanel component 3414-204648.
  Everything shown is data (guests, price lines, totals), so the example carries
  representative values rather than Figma properties.
*/

figma.connect(
  BuildPanelExpanded,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/SApp_UX-VD?node-id=3414-204648',
  {
    example: () => (
      <BuildPanelExpanded
        title="Paris to the Swiss Alps"
        startDate="01 JUL 2027 (MON)"
        endDate="12 JUL 2027 (MON)"
        details={['VA Herja', 'hrj270426t', '7 cr Nights / 11 Total Nights']}
        promoCode="AGRDN26-3"
        guests={[
          {
            label: 'Guest 1',
            name: 'Mr. John Smith Whitcombe',
            tpp: { eligible: true, included: true, amount: '$749.00' },
            sections: [
              {
                kind: 'cr',
                lines: [{ variant: 'list', label: 'cr Tour Fare', amount: '$11,349.00' }],
              },
            ],
            totalLabel: 'GUEST 1 TOTAL',
            total: '$23,984.00',
          },
        ]}
        grossTotal="$49,680.00"
        currencyCode="USD"
      />
    ),
  },
);
