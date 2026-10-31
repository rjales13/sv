import figma from '@figma/code-connect';
import { GuestSelector } from './guest-selector.tsx';

/*
  Code Connect for GuestSelector
  Figma: ShoppingApp_UX-VD, node 1282-155036

  Figma variants:
    Property 1 = "Default"    → variant="default"
    Property 1 = "Removable"  → variant="removable"
    Property 1 = "simple"     → variant="simple"

  onRemove is always passed; the component only renders Remove in the removable variant.
*/

figma.connect(
  GuestSelector,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1282-155036',
  {
    props: {
      variant: figma.enum('Property 1', {
        Default: 'default',
        Removable: 'removable',
        simple: 'simple',
      }),
    },
    example: ({ variant }) => (
      <GuestSelector
        variant={variant}
        name="Mr. John Smith Whitcombe"
        customerNumber="100838606001"
        birthday="5/23/1972"
        onRemove={() => {}}
      />
    ),
  },
);
