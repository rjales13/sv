import figma from '@figma/code-connect';
import { ItineraryRow } from './itinerary-row';

figma.connect(
  ItineraryRow,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=748-49033',
  {
    example: () => (
      <ItineraryRow variant="hotel" date="01 JUL 2027 (FRI)" cityCode="BUD" cityName="Budapest" />
    ),
  },
);
