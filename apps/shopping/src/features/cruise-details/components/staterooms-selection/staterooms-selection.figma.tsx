import figma from '@figma/code-connect';
import { StateroomsSelection } from './staterooms-selection';

/*
  Code Connect for StateroomsSelection (ShoppingApp_UX-VD, node 2569:126386).

  Figma exposes one VARIANT property — `Property 1` with two options:
    Default    → a category is selected; categoryName and categoryCode are present
    unselected → no category chosen yet; props are omitted and em-dash
                 placeholders render in the label row

  The right-side 83×18px placeholder div in the title row has no content in
  either Figma variant — omitted here until a concrete design lands there.
*/

// Default — a category has been selected by the agent.
figma.connect(
  StateroomsSelection,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2569-126386',
  {
    variant: { 'Property 1': 'Default' },
    example: () => <StateroomsSelection categoryName="Deluxe Veranda" categoryCode="DV3" />,
  },
);

// unselected — no category chosen yet; props are omitted.
figma.connect(
  StateroomsSelection,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2569-126386',
  {
    variant: { 'Property 1': 'unselected' },
    example: () => <StateroomsSelection />,
  },
);
