import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PriceLine } from './price-line';

const meta = {
  title: 'Shopping/PriceLine',
  component: PriceLine,
  parameters: { layout: 'padded' },
  args: {
    abbrev: 'DN2',
    price: '$114,799',
    statA: '10',
  },
} satisfies Meta<typeof PriceLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Available — open inventory. Hover this row to see the seventh Figma variant, which is CSS-driven. */
export const Available: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('DN2')).toBeInTheDocument();
    await expect(canvas.getByText('$114,799')).toBeInTheDocument();
    await expect(canvas.getByText('Available')).toBeInTheDocument();
  },
};

/** Limited — few cabins left. */
export const Limited: Story = {
  args: { status: 'limited' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Limited')).toBeInTheDocument();
  },
};

/** SoldOut — no cabins bookable; the whole row greys out. */
export const SoldOut: Story = {
  args: { status: 'soldout' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sold out')).toBeInTheDocument();
  },
};

/** Disabled — category not offered for this search. */
export const Disabled: Story = {
  args: { status: 'disabled' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Unavailable')).toBeInTheDocument();
  },
};

/** Selected — the chosen tier. Selection is orthogonal to inventory status. */
export const Selected: Story = {
  args: { selected: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('DN2')).toBeInTheDocument();
  },
};

/** SelectedLimited — a limited tier that is also the chosen one. */
export const SelectedLimited: Story = {
  args: { status: 'limited', selected: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Limited')).toBeInTheDocument();
  },
};
