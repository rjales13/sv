import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { VikingAirSummary } from './viking-air-summary.tsx';

const meta = {
  title: 'Shopping/VikingAirSummary',
  component: VikingAirSummary,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    airfare: '$9,595.00',
    discount: '$700.00',
    total: '$8,895.00',
  },
} satisfies Meta<typeof VikingAirSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const priceLines = (canvasElement: HTMLElement) =>
  canvasElement.querySelectorAll('[data-slot="price-line-item"]');

/** No gateway or airfare class chosen yet. */
export const Empty: Story = {
  args: { variant: 'empty' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Airfare Summary' })).toBeInTheDocument();
    await expect(canvas.getByText('Select Gateways and Airfare Class')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-slot="icon-badge"] svg')).toBeTruthy();
    await expect(priceLines(canvasElement)).toHaveLength(0);
  },
};

/** Airfare is being priced. */
export const Loading: Story = {
  args: { variant: 'loading' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    await expect(canvas.getByText('Calculating Airfare')).toBeInTheDocument();
    await expect(canvas.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  },
};

/** The guest declined Viking Air — amounts are ignored. */
export const NoAir: Story = {
  args: { variant: 'no-air' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Viking Air is not included')).toBeInTheDocument();
    await expect(canvas.queryByText('$9,595.00')).not.toBeInTheDocument();
    await expect(priceLines(canvasElement)).toHaveLength(0);
  },
};

/** Airfare, discount and per-guest total. */
export const Summarized: Story = {
  args: { variant: 'summarized' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(priceLines(canvasElement)).toHaveLength(3);
    await expect(canvas.getByText('Origin - Return Airfare')).toBeInTheDocument();
    await expect(canvas.getByText('$9,595.00')).toBeInTheDocument();
    await expect(canvas.getByText(/\$700\.00/)).toBeInTheDocument();
    await expect(canvas.getByText('Airfare Total')).toBeInTheDocument();
    await expect(canvas.getByText('$8,895.00')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-slot="itinerary-bullet"] svg')).toBeTruthy();
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};

/** All four states stacked as in the Figma frame. */
export const AllVariants: Story = {
  // Four "Airfare Summary" regions on one page only happens in this showcase; the app renders one.
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
  },
  render: (args) => (
    <div className="flex flex-col gap-8">
      <VikingAirSummary {...args} variant="empty" />
      <VikingAirSummary {...args} variant="loading" />
      <VikingAirSummary {...args} variant="no-air" />
      <VikingAirSummary {...args} variant="summarized" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('region', { name: 'Airfare Summary' })).toHaveLength(4);
  },
};
