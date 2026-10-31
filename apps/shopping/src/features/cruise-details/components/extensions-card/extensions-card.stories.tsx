import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ExtensionsCard, type ExtensionCardHotelStop } from './extensions-card';

const meta = {
  title: 'Shopping/ExtensionsCard',
  component: ExtensionsCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof ExtensionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const STOP_VERONA: ExtensionCardHotelStop = {
  departure: { date: '12 JUL 2027 (SAT)', cityCode: 'VRN', cityName: 'Verona' },
  arrival: { date: '13 JUL 2027 (SUN)', cityCode: 'VRN', cityName: 'Verona' },
  hotel: { name: 'Long Hotel Name Verona Hotel, Verona', type: 'Pre Hotel', nights: 2 },
};

const STOP_COMO: ExtensionCardHotelStop = {
  departure: { date: '13 JUL 2027 (SUN)', cityCode: 'OMO', cityName: 'Como' },
  arrival: { date: '14 JUL 2027 (MON)', cityCode: 'OMO', cityName: 'Como' },
  hotel: { name: 'Long Hotel Name Verona Hotel, Verona', type: 'Pre Hotel', nights: 2 },
};

const BULLETS = [
  '3 hotel nights in Milan (as shown or similar)',
  '3 meals: 3 breakfasts (B)',
  '1 included tour: Historic Milan by Foot',
  'Services of a Viking Host',
  'All transfers',
];

/** Single-hotel PRE extension with price and checkbox. Matches Figma "single hotel" variant. */
export const SingleHotel: Story = {
  args: {
    category: 'pre',
    title: 'Extension Name',
    meta: '4 NIGHTS',
    priceLabel: '54 Available',
    amount: '$4,999.00',
    currencyCode: 'USD',
    stops: [STOP_VERONA],
    descriptionBullets: BULLETS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Extension Name')).toBeInTheDocument();
    await expect(canvas.getByRole('checkbox')).toBeInTheDocument();
    await expect(canvas.getByText('Add this extension')).toBeInTheDocument();
  },
};

/** Multi-hotel PRE extension with 4 stops. Matches Figma "multi hotel" variant. */
export const MultiHotel: Story = {
  args: {
    category: 'pre',
    title: 'Extension Name',
    meta: '4 NIGHTS',
    priceLabel: '54 Available',
    amount: '$4,999.00',
    currencyCode: 'USD',
    stops: [STOP_VERONA, STOP_COMO, STOP_COMO, STOP_COMO],
    descriptionBullets: BULLETS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Extension Name')).toBeInTheDocument();
    await expect(canvas.getAllByText('Long Hotel Name Verona Hotel, Verona')).toHaveLength(4);
  },
};

/** Land-package extension — subtle bg, "Included" in header, invisible checkbox. */
export const LandPackage: Story = {
  args: {
    category: 'land-package',
    title: 'Extension Name',
    meta: '4 NIGHTS',
    included: true,
    stops: [STOP_VERONA, STOP_COMO, STOP_COMO, STOP_COMO],
    descriptionBullets: BULLETS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Extension Name')).toBeInTheDocument();
    await expect(canvas.getByText('Included')).toBeInTheDocument();
  },
};

/** POST extension that is sold out — SOLD OUT badge, no checkbox. */
export const SoldOut: Story = {
  args: {
    category: 'post',
    title: 'Extension Name',
    meta: '4 NIGHTS',
    soldOut: true,
    stops: [STOP_VERONA],
    descriptionBullets: BULLETS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/sold out/i)).toBeInTheDocument();
    await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
  },
};
