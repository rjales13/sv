import figma from '@figma/code-connect';
import { ResultsCard } from './results-card';

/*
  Code Connect for ResultsCard (ShoppingApp_UX-VD, node 2189:392310).

  CruiseResults-Card is a top-level composition of seven code-connected
  sub-components. This connection maps the outer card frame so Figma shows
  the full assembled example when a designer inspects node 2189:392310.
  Sub-component connections live in their own feature slices:
    CardHeader     → card-header/components/card-header.figma.tsx
    ItineraryRow   → itinerary-row/components/itinerary-row.figma.tsx
    CategoryBand   → category-column/components/category-column.figma.tsx
*/

figma.connect(
  ResultsCard,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=608-128203',
  {
    example: () => (
      <ResultsCard
        category="rivers"
        title="Paris to the Swiss Alps"
        meta="EUR"
        ship="Viking Herja"
        voyageCode="HRJ270426T"
        priceLabel="Starting at"
        amount="$5,999.00"
        currencyCode="USD"
        from="Paris"
        to="Zürich"
        nightsLabel="7 Cruise Nights / 11 Total Nights"
        remaining="9+ remaining"
        itinerary={[
          { variant: 'hotel', date: '01 JUL 2027 (SAT)', cityCode: 'PAR', cityName: 'Paris' },
          { variant: 'departure', date: '03 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
          { variant: 'arrival', date: '09 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
          { variant: 'hotel', date: '11 JUL 2027 (WED)', cityCode: 'PAR', cityName: 'Zürich' },
        ]}
        pricingColumns={[
          {
            title: 'Explorer Suite',
            items: [
              { abbrev: 'ES1', price: '$114,799', statA: '10' },
              { abbrev: 'ES2', price: '$114,799', statA: '10' },
              { abbrev: 'ES3', price: '$114,799', statA: '10' },
              { abbrev: 'ES4', price: '$114,799', statA: '10' },
            ],
          },
          {
            title: 'Penthouse Jr. Suite',
            items: [
              { abbrev: 'PS1', price: '$114,799', statA: '10' },
              { abbrev: 'PS2', price: '$114,799', statA: '10' },
              { abbrev: 'PS3', price: '$114,799', statA: '10' },
              { abbrev: 'PS4', price: '$114,799', statA: '10' },
            ],
          },
          {
            title: 'Deluxe Veranda',
            items: [
              { abbrev: 'DV1', price: '$44,200', statA: '12' },
              { abbrev: 'DV2', price: '$44,200', statA: '12' },
            ],
          },
        ]}
      />
    ),
  },
);
