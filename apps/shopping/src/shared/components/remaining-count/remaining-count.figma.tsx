import figma from '@figma/code-connect';
import { RemainingCount } from './remaining-count';

/*
  Code Connect for RemainingCount (ShoppingApp_UX-VD, node 3060:129349).

  Figma has one VARIANT property — `Property 1` with two options:
    more9  →  lowInventory={false}  navy text (text-fjord)
    less9  →  lowInventory={true}   red text  (text-viking-red)

  Both variants share the same JSX shape, so a single connection with
  figma.enum() is correct. The `count` text is hardcoded in Figma (no
  bound TEXT property), so representative values are shown in the example.
*/

figma.connect(
  RemainingCount,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=3060-129349',
  {
    props: {
      lowInventory: figma.enum('Property 1', { less9: true }),
      count: figma.enum('Property 1', { more9: '9+ remaining', less9: '7 remaining' }),
    },
    example: ({ lowInventory, count }) => (
      <RemainingCount count={count} lowInventory={lowInventory} />
    ),
  },
);
