import figma from '@figma/code-connect';
import { StateroomsCategorySelection } from './staterooms-category-selection';

/*
  Code Connect for StateroomsCategorySelection (ShoppingApp_UX-VD, node 2544:97905).

  Figma exposes one VARIANT property — `Property 1` with two options:
    Default  →  categoryName + categoryCode + price all present
    empty    →  no props; em-dash "–" placeholders are shown

  The JSX shape is the same for both variants (props are just absent or present),
  so two variant-filtered connections are used to give designers a clear example
  of each usage pattern.
*/

// Default — a category has been selected.
figma.connect(
  StateroomsCategorySelection,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2544-97905',
  {
    variant: { 'Property 1': 'Default' },
    example: () => (
      <StateroomsCategorySelection
        categoryName="Deluxe Veranda"
        categoryCode="DV3"
        price="$9,999"
      />
    ),
  },
);

// empty — no category selected yet; all props omitted and "–" placeholders render.
figma.connect(
  StateroomsCategorySelection,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2544-97905',
  {
    variant: { 'Property 1': 'empty' },
    example: () => <StateroomsCategorySelection />,
  },
);
