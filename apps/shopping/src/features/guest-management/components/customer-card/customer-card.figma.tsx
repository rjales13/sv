import figma from '@figma/code-connect';
import { CustomerCard } from './customer-card.tsx';

/*
  Code Connect for CustomerCard — ShoppingApp_UX-VD, node 1164-209432.
  "Property 1" variants are data states; each maps to a prop combination.
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1164-209432';

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Default-1PAX' },
  example: () => (
    <CustomerCard
      contact={{
        role: 'customer',
        name: 'Mr. John Smith Whitcombe',
        id: '100838606001',
        pastGuest: true,
      }}
      guests={['Mr. Jhon Smith Whitcombe']}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Default-2PAX' },
  example: () => (
    <CustomerCard
      contact={{
        role: 'customer',
        name: 'Mr. John Smith Whitcombe',
        id: '100838606001',
        pastGuest: true,
      }}
      guests={['Mr. Jhon Smith Whitcombe', 'Ms. Mary Stone Davis']}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Expanded-1PAX' },
  example: () => (
    <CustomerCard
      expanded
      contact={{
        role: 'customer',
        name: 'Mr. John Smith Whitcombe',
        id: '100838606001',
        pastGuest: true,
      }}
      guests={['Mr. Jhon Smith Whitcombe']}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Expanded-2PAX' },
  example: () => (
    <CustomerCard
      expanded
      contact={{
        role: 'customer',
        name: 'Mr. John Smith Whitcombe',
        id: '100838606001',
        pastGuest: true,
      }}
      guests={['Mr. Jhon Smith Whitcombe', 'Ms. Mary Stone Davis']}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Unselected' },
  example: () => (
    <CustomerCard
      contact={{
        role: 'customer',
        name: 'Mr. John Smith Whitcombe',
        id: '100838606001',
        pastGuest: true,
      }}
      guests={[]}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'TA-unselected-guest' },
  example: () => (
    <CustomerCard
      contact={{ role: 'travel-agent', name: 'Patty Kole', id: '270348' }}
      guests={[]}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'TA-unselected-guest-expanded' },
  example: () => (
    <CustomerCard
      expanded
      contact={{ role: 'travel-agent', name: 'Patty Kole', id: '270348' }}
      guests={[]}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'TA-collapsed-guests' },
  example: () => (
    <CustomerCard
      contact={{ role: 'travel-agent', name: 'Patty Kole', id: '270348' }}
      guests={['Mr. Jhon Smith Whitcombe']}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'TA-expanded-guests' },
  example: () => (
    <CustomerCard
      expanded
      contact={{ role: 'travel-agent', name: 'Patty Kole', id: '270348' }}
      guests={['Mr. Jhon Smith Whitcombe']}
    />
  ),
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Unselected-collapsed' },
  example: () => <CustomerCard guests={[]} />,
});

figma.connect(CustomerCard, URL, {
  variant: { 'Property 1': 'Unselected-expanded' },
  example: () => <CustomerCard expanded guests={[]} />,
});
