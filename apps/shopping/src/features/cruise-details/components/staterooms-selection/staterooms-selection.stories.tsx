import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StateroomsSelection } from './staterooms-selection';

const meta = {
  title: 'Shopping/StateroomsSelection',
  component: StateroomsSelection,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof StateroomsSelection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default — a category (Deluxe Veranda DV3) has been selected by the agent. */
export const Default: Story = {
  args: {
    categoryName: 'Deluxe Veranda',
    categoryCode: 'DV3',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Stateroom Selection')).toBeInTheDocument();
    await expect(canvas.getByText('Deluxe Veranda')).toBeInTheDocument();
    await expect(canvas.getByText('DV3')).toBeInTheDocument();
  },
};

/** Unselected — no category chosen yet; em-dash placeholders appear. */
export const Unselected: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Stateroom Selection')).toBeInTheDocument();
    // Two em-dash placeholders: one for name, one for code.
    const dashes = canvas.getAllByText('–');
    await expect(dashes).toHaveLength(2);
    await expect(canvas.queryByText('Deluxe Veranda')).not.toBeInTheDocument();
  },
};

/** Long category name — confirms truncation doesn't break layout. */
export const LongCategoryName: Story = {
  args: {
    categoryName: 'Penthouse Junior Suite with Extended Veranda',
    categoryCode: 'PJV',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Stateroom Selection')).toBeInTheDocument();
    await expect(
      canvas.getByText('Penthouse Junior Suite with Extended Veranda'),
    ).toBeInTheDocument();
    await expect(canvas.getByText('PJV')).toBeInTheDocument();
  },
};
