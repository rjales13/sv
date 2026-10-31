import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StateroomsDeckplanConventions } from './staterooms-deckplan-conventions';

// Colors from Figma: #a2bacb (light steel-blue amenities), #83a4a5 (teal dining)
const LIGHT = '#a2bacb';
const TEAL = '#83a4a5';

const VENUES_2_LINES = [
  { label: 'Fitness Center', color: LIGHT },
  { label: 'Guests Services', color: LIGHT },
  { label: 'Hair Salon', color: LIGHT },
  { label: "Manfredi's Italian Restaurant®", color: TEAL },
  { label: 'Shops', color: LIGHT },
  { label: 'Bar', color: LIGHT },
  { label: "The Chef's Table", color: TEAL },
  { label: 'The Kitchen Table', color: TEAL },
  { label: 'The Living Room', color: LIGHT },
  { label: 'The Nordic Spa', color: LIGHT },
];

const meta = {
  title: 'Shopping/StateroomsDeckplanConventions',
  component: StateroomsDeckplanConventions,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { items: VENUES_2_LINES },
} satisfies Meta<typeof StateroomsDeckplanConventions>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 2 lines — full venue list, wraps to a second row at 852px. Matches Figma "2 lines" variant. */
export const TwoLines: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Fitness Center')).toBeInTheDocument();
    await expect(canvas.getByText("Manfredi's Italian Restaurant®")).toBeInTheDocument();
    await expect(canvas.getByText('The Nordic Spa')).toBeInTheDocument();
    // All 10 items produce one listitem each.
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10);
  },
};

/** 1 line — first six venues only, fits on a single row. Matches Figma "1 line" variant. */
export const OneLine: Story = {
  args: { items: VENUES_2_LINES.slice(0, 6) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Bar')).toBeInTheDocument();
    // Second-line venues must not be present.
    await expect(canvas.queryByText("The Chef's Table")).not.toBeInTheDocument();
    await expect(canvas.queryByText('The Nordic Spa')).not.toBeInTheDocument();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(6);
  },
};

/** Empty — no items; only the container renders. */
export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('listitem')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Fitness Center')).not.toBeInTheDocument();
  },
};
