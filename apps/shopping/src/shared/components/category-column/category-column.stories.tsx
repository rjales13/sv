import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CategoryColumn } from './category-column';

const meta = {
  title: 'Shopping/CategoryColumn',
  component: CategoryColumn,
  parameters: { layout: 'padded' },
  args: {
    title: 'Owners Suite',
    items: [
      { abbrev: 'DN2', price: '$114,799', statA: '10' },
      { abbrev: 'DN1', price: '$98,500', statA: '4' },
    ],
  },
} satisfies Meta<typeof CategoryColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — a category with two bookable tiers. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('group', { name: 'Owners Suite' })).toBeInTheDocument();
    await expect(canvas.getByText('DN2')).toBeInTheDocument();
  },
};

/** MixedStatuses — inventory varies per tier, so each row carries its own colour. */
export const MixedStatuses: Story = {
  args: {
    title: 'Deluxe Veranda',
    items: [
      { abbrev: 'DV1', price: '$44,200', statA: '12' },
      { abbrev: 'DV2', price: '$41,900', statA: '2', status: 'limited' },
      { abbrev: 'DV3', price: '$39,500', status: 'soldout' },
      { abbrev: 'DV4', price: '$37,100', status: 'disabled' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Limited')).toBeInTheDocument();
    await expect(canvas.getByText('Sold out')).toBeInTheDocument();
  },
};

/** LongTitle — a name wider than the column truncates rather than wrapping. */
export const LongTitle: Story = {
  args: { title: 'Penthouse Junior Suite With A Very Long Name', className: 'w-[167px]' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Penthouse Junior Suite With A Very Long Name')).toBeVisible();
  },
};
