import figma from '@figma/code-connect';
import { CategoryBand } from './category-band';

/*
  The Figma variants "3/4/5/6 columns" and "6columns-3tiers" differ only in how
  many columns and tiers the designer placed, so they map to array length rather
  than to props — one connection covers them all.

  The "double" / "double-disabled" variants are two stacked bands and are not
  covered by this component.
*/

figma.connect(
  CategoryBand,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/SApp_UX-VD?node-id=2562-61098',
  {
    example: () => (
      <CategoryBand
        columns={[
          { title: 'Owners Suite', items: [{ abbrev: 'DN2', price: '$114,799', statA: '10' }] },
          { title: 'Explorer Suite', items: [{ abbrev: 'EX1', price: '$98,500', statA: '4' }] },
          { title: 'Deluxe Veranda', items: [{ abbrev: 'DV1', price: '$44,200', statA: '12' }] },
        ]}
      />
    ),
  },
);
