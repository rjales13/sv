import figma from '@figma/code-connect';
import { RouteIndicator } from './route-indicator';

/*
  Code Connect for RouteIndicator (ShoppingApp_UX-VD, node 3060:129339).

  Figma has one VARIANT property — `Property 1` with two options:
    default    →  roundtrip absent, `to` city shown, arrow_forward-16 icon
    roundtrip  →  roundtrip={true}, "Roundtrip" label, sync icon

  The two variants produce different JSX shapes (`to` prop absent on roundtrip),
  so two variant-filtered connections are required rather than one with figma.enum.
*/

// Default — point-to-point with forward arrow.
figma.connect(
  RouteIndicator,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=3060-129339',
  {
    variant: { 'Property 1': 'default' },
    example: () => <RouteIndicator from="Paris" to="Zürich" />,
  },
);

// Roundtrip — sync icon and "Roundtrip" label; `to` is not shown.
figma.connect(
  RouteIndicator,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=3060-129339',
  {
    variant: { 'Property 1': 'roundtrip' },
    example: () => <RouteIndicator from="Paris" roundtrip />,
  },
);
