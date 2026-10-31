import figma from '@figma/code-connect';
import { VikingAirGuestCard } from './viking-air-guest-card.tsx';

/*
  Code Connect for VikingAirGuestCard — ShoppingApp_UX-VD, node 3292-167937.
  "Property 1" variants are card states, so each maps to a prop combination:
    guest 1 → copyToNextGuest · guest 2 → no copy checkbox · collapsed → expanded={false}
    no viking air → includeAirfare={false} · disabled → disabled
*/

const URL =
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=3292-167937';

figma.connect(VikingAirGuestCard, URL, {
  variant: { 'Property 1': 'guest 1' },
  example: () => (
    <VikingAirGuestCard
      title="Guest 1 / Main PAX"
      guest={{ name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' }}
      includeAirfare
      gatewayOptions={[]}
      classOptions={[]}
      copyToNextGuest={{ label: 'Use the same information for Guest 2', checked: true }}
    />
  ),
});

figma.connect(VikingAirGuestCard, URL, {
  variant: { 'Property 1': 'guest 2' },
  example: () => (
    <VikingAirGuestCard
      title="Guest 2"
      guest={{ name: 'Mary Stone Davis', customerNumber: '1008294389013' }}
      includeAirfare
      gatewayOptions={[]}
      classOptions={[]}
    />
  ),
});

figma.connect(VikingAirGuestCard, URL, {
  variant: { 'Property 1': 'collapsed' },
  example: () => (
    <VikingAirGuestCard
      title="Guest 1 / Main PAX"
      guest={{ name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' }}
      expanded={false}
      includeAirfare
      gatewayOptions={[]}
      classOptions={[]}
    />
  ),
});

figma.connect(VikingAirGuestCard, URL, {
  variant: { 'Property 1': 'no viking air' },
  example: () => (
    <VikingAirGuestCard
      title="Guest 1 / Main PAX"
      guest={{ name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' }}
      includeAirfare={false}
      gatewayOptions={[]}
      classOptions={[]}
    />
  ),
});

figma.connect(VikingAirGuestCard, URL, {
  variant: { 'Property 1': 'disabled' },
  example: () => (
    <VikingAirGuestCard
      title="Guest 1 / Main PAX"
      guest={{ name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' }}
      includeAirfare
      disabled
      gatewayOptions={[]}
      classOptions={[]}
      copyToNextGuest={{ label: 'Use the same information for Guest 2', checked: true }}
    />
  ),
});
