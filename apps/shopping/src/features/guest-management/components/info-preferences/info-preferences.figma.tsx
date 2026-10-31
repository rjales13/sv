import figma from '@figma/code-connect';
import { InfoPreferences } from './info-preferences.tsx';

/*
  Code Connect for InfoPreferences — ShoppingApp_UX-VD, node 1282-155138.
    Property 1: expanded → expanded · collapsed → expanded={false}
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1282-155138';

figma.connect(InfoPreferences, URL, {
  props: {
    expanded: figma.enum('Property 1', { expanded: true, collapsed: false }),
  },
  example: ({ expanded }) => (
    <InfoPreferences
      expanded={expanded}
      info={{
        propensityScore: '75%',
        pastTravels: '5',
        osVouchers: 'Yes',
        bnd: '8',
        localTime: '12:00 PM PST',
        offeredBookings: '1',
      }}
    />
  ),
});
