import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StateroomsDeckplan } from './staterooms-deckplan';

const OVS_BASE = '/context/mock-data/prototype-cruises/deck-plans/OVS';

const AMENITY_CONVENTIONS = [
  { label: 'Fitness Center', color: '#a2bacb' },
  { label: 'Guests Services', color: '#a2bacb' },
  { label: 'Hair Salon', color: '#a2bacb' },
  { label: "Manfredi's Italian Restaurant®", color: '#83a4a5' },
  { label: 'Shops', color: '#a2bacb' },
  { label: 'Bar', color: '#a2bacb' },
  { label: "The Chef's Table", color: '#83a4a5' },
  { label: 'The Kitchen Table', color: '#83a4a5' },
  { label: 'The Living Room', color: '#a2bacb' },
  { label: 'The Nordic Spa', color: '#a2bacb' },
];

const CABIN_CONVENTIONS = [
  { label: 'DV1: Deluxe Veranda', color: '#4a7ea5' },
  { label: 'DV2: Deluxe Veranda', color: '#6fa3c4' },
  { label: 'DV3: Deluxe Veranda', color: '#8fc0d9' },
  { label: 'ES1: Explorer Suite', color: '#c0304a' },
  { label: 'PV1: Penthouse Veranda', color: '#8a4fa5' },
  { label: 'PV2: Penthouse Veranda', color: '#b47fc4' },
];

const meta = {
  title: 'Shopping/StateroomsDeckplan',
  component: StateroomsDeckplan,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    sideviewSrc: `${OVS_BASE}/sideview.svg`,
    floorplanSrc: `${OVS_BASE}/deck-01.svg`,
    conventions: AMENITY_CONVENTIONS,
  },
} satisfies Meta<typeof StateroomsDeckplan>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default — ship sideview + DECK 1 (amenities) floor plan. Matches Figma SKY-Default-DECK1. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByAltText('ship sideview')).toBeInTheDocument();
    await expect(canvas.getByAltText('deck floor plan')).toBeInTheDocument();
    await expect(canvas.getByText('Fitness Center')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'expand' })).toBeInTheDocument();
  },
};

/** Deck5 — DECK 5 (cabin staterooms) floor plan. Matches Figma SKY-deck5. */
export const Deck5: Story = {
  args: {
    floorplanSrc: `${OVS_BASE}/deck-05.svg`,
    conventions: CABIN_CONVENTIONS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByAltText('deck floor plan')).toBeInTheDocument();
    await expect(canvas.getByText('DV1: Deluxe Veranda')).toBeInTheDocument();
  },
};

/** Expanded — shows the collapse icon. Matches Figma SKY-expanded. */
export const Expanded: Story = {
  args: { isExpanded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'collapse' })).toBeInTheDocument();
  },
};

/** WithDeckSelector — deck dropdown rendered at the top of the panel (Figma node 2569:179058). */
export const WithDeckSelector: Story = {
  args: {
    decks: [
      { label: 'Deck A' },
      { label: 'Deck 1' },
      { label: 'Deck 2' },
      { label: 'Deck 3' },
    ],
    selectedDeckIndex: 1,
    floorplanSrc: `${OVS_BASE}/deck-01.svg`,
    conventions: AMENITY_CONVENTIONS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: /select deck/i })).toBeInTheDocument();
  },
};
