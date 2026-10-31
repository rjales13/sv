import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CruiseContextCard } from './context-card';

/*
  CruiseContextCard — ShoppingApp_UX-VD node 1043:176419.

  Figma's two variants ("cruise package" / "cruise only") are reproduced by the
  `itinerary` array plus `lowInventory`, not by a variant prop — see the note at
  the top of cruise-context-card.tsx.
*/

const PACKAGE_ITINERARY = [
  { variant: 'hotel' as const, date: '01 JUL 2027 (SAT)', cityCode: 'ZUR', cityName: 'Zürich' },
  { variant: 'departure' as const, date: '01 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
  { variant: 'arrival' as const, date: '01 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
  { variant: 'hotel' as const, date: '01 JUL 2027 (WED)', cityCode: 'PAR', cityName: 'Paris' },
];

const CRUISE_ONLY_ITINERARY = [
  { variant: 'departure' as const, date: '01 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
  { variant: 'arrival' as const, date: '01 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
];

const meta = {
  title: 'Shopping/CruiseContextCard',
  component: CruiseContextCard,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    category: 'rivers',
    title: 'Paris to the Swiss Alps',
    meta: 'EUR',
    ship: 'Viking Herja',
    voyageCode: 'HRJ270426T',
    from: 'Paris',
    to: 'Zürich',
    nightsLabel: '7 Cruise Nights / 11 Total Nights',
    itinerary: PACKAGE_ITINERARY,
  },
  argTypes: {
    category: {
      control: 'select',
      options: ['oceans', 'rivers', 'expeditions', 'mississippi'],
    },
  },
} satisfies Meta<typeof CruiseContextCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** CruisePackage — the sailing bracketed by its hotel nights; inventory healthy. */
export const CruisePackage: Story = {
  args: { remaining: '9+ remaining' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Paris to the Swiss Alps')).toBeInTheDocument();
    await expect(canvas.getByText('Rivers')).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(4);
    await expect(canvas.getByTestId('cruise-context-remaining')).toHaveAttribute(
      'data-low-inventory',
      'false',
    );
  },
};

/** CruiseOnly — sailing segments only, and low enough to warrant the red count. */
export const CruiseOnly: Story = {
  args: { itinerary: CRUISE_ONLY_ITINERARY, remaining: '7 remaining', lowInventory: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(2);
    await expect(canvas.getByTestId('cruise-context-remaining')).toHaveAttribute(
      'data-low-inventory',
      'true',
    );
    await expect(canvas.getByText('Low availability')).toBeInTheDocument();
  },
};

/** LowInventoryPackage — the case Figma's variant axis could not express. */
export const LowInventoryPackage: Story = {
  args: { remaining: '3 remaining', lowInventory: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(4);
    await expect(canvas.getByTestId('cruise-context-remaining')).toHaveAttribute(
      'data-low-inventory',
      'true',
    );
  },
};

/** WithoutRemaining — no availability figure; the identity row closes up. */
export const WithoutRemaining: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('cruise-context-remaining')).not.toBeInTheDocument();
    await expect(canvas.getByText('Paris to the Swiss Alps')).toBeInTheDocument();
  },
};

/** Extension — no ship or voyage code, so the meta strip is the currency alone. */
export const Extension: Story = {
  args: { ship: undefined, voyageCode: undefined, meta: '4 Nights', remaining: '9+ remaining' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('4 Nights')).toBeInTheDocument();
    await expect(canvas.queryByText('Viking Herja')).not.toBeInTheDocument();
  },
};
