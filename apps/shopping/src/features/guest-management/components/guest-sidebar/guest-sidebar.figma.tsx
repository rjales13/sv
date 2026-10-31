import figma from '@figma/code-connect';
import { GuestSidebar } from './guest-sidebar.tsx';

/*
  Code Connect for GuestSidebar — ShoppingApp_UX-VD, node 1286-156183.
  "Property 1" variants are data states:
    Default → guest given · Empty → no guest + dropdown · Disabled → Empty + disabled
    TA-GuestUnselected → no guest, no dropdown (empty-state Add guest)
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1286-156183';

const ASSOCIATED_CONTACTS = {
  groups: [
    {
      label: 'Household members',
      contacts: [{ id: 'mary', name: 'Ms. Mary Stone Davis', customerNumber: '1008294389013' }],
    },
  ],
};

figma.connect(GuestSidebar, URL, {
  variant: { 'Property 1': 'Default' },
  example: () => (
    <GuestSidebar
      title="Guest 1 / Main PAX"
      guest={{
        name: 'Mr. John Smith Whitcombe',
        customerNumber: '100838606001',
        birthday: '5/23/1972',
        contact: {
          email: 'john371@outlook.com',
          phone: '(781) 283-10395',
          address: '45 PINECREST AVENUE, HARRISBURG, PA 1710, United States',
        },
        info: {
          propensityScore: '75%',
          pastTravels: '5',
          osVouchers: 'Yes',
          bnd: '1',
          localTime: '12:00 PM PST',
          offeredBookings: '2',
        },
      }}
      associatedContacts={ASSOCIATED_CONTACTS}
      onRemoveGuest={() => {}}
      onEditContact={() => {}}
    />
  ),
});

figma.connect(GuestSidebar, URL, {
  variant: { 'Property 1': 'Empty' },
  example: () => (
    <GuestSidebar title="Guest 2" associatedContacts={ASSOCIATED_CONTACTS} onAddGuest={() => {}} />
  ),
});

figma.connect(GuestSidebar, URL, {
  variant: { 'Property 1': 'Disabled' },
  example: () => (
    <GuestSidebar
      title="Guest 2"
      associatedContacts={ASSOCIATED_CONTACTS}
      onAddGuest={() => {}}
      disabled
    />
  ),
});

figma.connect(GuestSidebar, URL, {
  variant: { 'Property 1': 'TA-GuestUnselected' },
  example: () => <GuestSidebar title="Guest 1 / Main PAX" onAddGuest={() => {}} />,
});
