import figma from '@figma/code-connect';
import { MenuOptionComplex } from './menu-options.tsx';

/*
  Code Connect for MenuOptionComplex — ShoppingApp_UX-VD, node 1286-155666.
    Property 1: s-selected → selected · s-disabled → disabled
    s-default / s-hover / s-focus → no props (hover and focus are CSS-driven)
*/

figma.connect(
  MenuOptionComplex,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1286-155666',
  {
    props: {
      selected: figma.enum('Property 1', { 's-selected': true }),
      disabled: figma.enum('Property 1', { 's-disabled': true }),
    },
    example: ({ selected, disabled }) => (
      <MenuOptionComplex
        guest={{ name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' }}
        selected={selected}
        disabled={disabled}
        onSelect={() => {}}
      />
    ),
  },
);
