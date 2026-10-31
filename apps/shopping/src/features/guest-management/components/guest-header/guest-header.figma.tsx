import figma from '@figma/code-connect';
import { GuestHeader } from './guest-header.tsx';

/*
  Code Connect for GuestHeader — ShoppingApp_UX-VD, node 1282-155078.
    Property 1: collapse → expanded={false} · expanded → expanded
    Button (boolean) → onAddGuest passed (shows Add Guest)
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1282-155078';

figma.connect(GuestHeader, URL, {
  variant: { Button: true },
  props: {
    expanded: figma.enum('Property 1', { collapse: false, expanded: true }),
  },
  example: ({ expanded }) => (
    <GuestHeader title="Guest 1" expanded={expanded} onAddGuest={() => {}} />
  ),
});

figma.connect(GuestHeader, URL, {
  variant: { Button: false },
  props: {
    expanded: figma.enum('Property 1', { collapse: false, expanded: true }),
  },
  example: ({ expanded }) => <GuestHeader title="Guest 1" expanded={expanded} />,
});
