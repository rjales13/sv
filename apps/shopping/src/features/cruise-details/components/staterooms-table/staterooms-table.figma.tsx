import figma from '@figma/code-connect';
import { StateroomsTable } from './staterooms-table';

/*
  Code Connect for StateroomsTable (ShoppingApp_UX-VD, node 2566:122877).

  Three variants on `Property 1`:
    Default  → real stateroom rows, one row selected (checked)
    empty    → no rows; icon + "Select a Stateroom Category"
    GTY-only → single GTY row + info alert explaining guarantee booking

  Code connections used in this component:
    Checkbox (InputCheckbox) — @vikings/ui/components/checkbox, size="sm"
    VAlert                   — shared/components/alert, variant="info"
    Icon                     — @vikings/ui/components/icon, IconContentHotel (empty badge)
*/

const ROWS_EXAMPLE = [
  { stateroom: '5047', checked: true },
  { stateroom: '5065' },
  { stateroom: '4080' },
];

// Default — staterooms available, one selected.
figma.connect(
  StateroomsTable,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2566-122877',
  {
    variant: { 'Property 1': 'Default' },
    example: () => <StateroomsTable rows={ROWS_EXAMPLE} />,
  },
);

// empty — no category selected yet.
figma.connect(
  StateroomsTable,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2566-122877',
  {
    variant: { 'Property 1': 'empty' },
    example: () => <StateroomsTable />,
  },
);

// GTY-only — only a Guarantee booking is available.
figma.connect(
  StateroomsTable,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2566-122877',
  {
    variant: { 'Property 1': 'GTY-only' },
    example: () => <StateroomsTable rows={[{ stateroom: 'GTY' }]} isGtyOnly />,
  },
);
