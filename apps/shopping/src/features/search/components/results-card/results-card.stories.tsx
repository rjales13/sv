import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { ResultsCard } from './results-card';

/*
  ResultsCard — assembled cruise result card (node 2189:392310).

  Stories cover the Figma reference layout plus the key variant states:
  selected compare checkbox, sold-out header, and omitted remaining count.
*/

const ITINERARY = [
  { variant: 'hotel' as const, date: '01 JUL 2027 (SAT)', cityCode: 'PAR', cityName: 'Paris' },
  { variant: 'departure' as const, date: '03 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
  { variant: 'arrival' as const, date: '09 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
  { variant: 'hotel' as const, date: '11 JUL 2027 (WED)', cityCode: 'PAR', cityName: 'Zürich' },
];

const COLUMNS = [
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
];

const meta = {
  title: 'Shopping/ResultsCard',
  component: ResultsCard,
  parameters: { layout: 'padded' },
  args: {
    category: 'rivers',
    title: 'Paris to the Swiss Alps',
    meta: 'EUR',
    ship: 'Viking Herja',
    voyageCode: 'HRJ270426T',
    priceLabel: 'Starting at',
    amount: '$5,999.00',
    currencyCode: 'USD',
    from: 'Paris',
    to: 'Zürich',
    nightsLabel: '7 Cruise Nights / 11 Total Nights',
    itinerary: ITINERARY,
    pricingColumns: COLUMNS,
    selected: false,
    onSelectChange: fn(),
    onCruiseDetails: fn(),
  },
} satisfies Meta<typeof ResultsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — the full Figma reference card: rivers, four itinerary stops, three pricing columns. */
export const Default: Story = {
  args: { remaining: '9+ remaining' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Paris to the Swiss Alps')).toBeInTheDocument();
    await expect(canvas.getByText('Rivers')).toBeInTheDocument();
    // 'Paris' appears in both the summary row (from) and the first itinerary stop — use getAllByText
    await expect(canvas.getAllByText('Paris').length).toBeGreaterThan(0);
    await expect(canvas.getByText('7 Cruise Nights / 11 Total Nights')).toBeInTheDocument();
    await expect(canvas.getByText('9+ remaining')).toBeInTheDocument();
    await expect(canvas.getByText('01 JUL 2027 (SAT)')).toBeInTheDocument();
    await expect(canvas.getByText('Explorer Suite')).toBeInTheDocument();
    await expect(canvas.queryByText('Select to compare')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /cruise details/i })).toBeInTheDocument();
  },
};

/** Selected — "Select to compare" is a future feature; the card renders without the checkbox. */
export const Selected: Story = {
  args: { selected: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('checkbox', { name: /select to compare/i })).not.toBeInTheDocument();
  },
};

/** SoldOut — the price block in the header is replaced by a SOLD OUT badge. */
export const SoldOut: Story = {
  args: { soldOut: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/sold out/i)).toBeInTheDocument();
    await expect(canvas.queryByText('$5,999.00')).not.toBeInTheDocument();
  },
};

/** NoRemaining — the availability count is omitted for sailings without the data. */
export const NoRemaining: Story = {
  // No remaining key — omitting instead of passing undefined (exactOptionalPropertyTypes)
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('9+ remaining')).not.toBeInTheDocument();
  },
};
