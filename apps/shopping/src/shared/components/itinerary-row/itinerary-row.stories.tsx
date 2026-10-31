import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ItineraryRow } from './itinerary-row';

const meta = {
  title: 'Shopping/ItineraryRow',
  component: ItineraryRow,
  parameters: { layout: 'padded' },
  args: {
    variant: 'hotel',
    date: '01 JUL 2027 (FRI)',
    cityCode: 'BUD',
    cityName: 'Budapest',
  },
} satisfies Meta<typeof ItineraryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hotel — overnight stay ashore before or after the sailing. */
export const Hotel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('01 JUL 2027 (FRI)')).toBeInTheDocument();
    await expect(canvas.getByText('BUD')).toBeInTheDocument();
    await expect(canvas.getByText('Budapest')).toBeInTheDocument();
  },
};

/** Sailing — a day at sea between ports. */
export const Sailing: Story = {
  args: {
    variant: 'sailing',
    date: '02 JUL 2027 (SAT)',
    cityCode: 'VIE',
    cityName: 'Vienna',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Vienna')).toBeInTheDocument();
  },
};

/** Port — embarkation, a port call, or disembarkation. */
export const Port: Story = {
  args: {
    variant: 'port',
    date: '03 JUL 2027 (SUN)',
    cityCode: 'PRG',
    cityName: 'Prague',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Prague')).toBeInTheDocument();
  },
};
