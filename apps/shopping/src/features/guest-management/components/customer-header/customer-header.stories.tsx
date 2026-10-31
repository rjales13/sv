import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { CustomerHeader } from './customer-header.tsx';

const meta = {
  title: 'Shopping/CustomerHeader',
  component: CustomerHeader,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    guest: { name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001', birthday: '5/23/1972' },
    travelingAsMain: true,
    onTravelingAsMainChange: fn(),
  },
  // Holds the switch state so it responds in the canvas.
  render: function StatefulHeader(args) {
    const [travelingAsMain, setTravelingAsMain] = useState(args.travelingAsMain);
    return (
      <CustomerHeader
        {...args}
        travelingAsMain={travelingAsMain}
        onTravelingAsMainChange={(next) => {
          setTravelingAsMain(next);
          args.onTravelingAsMainChange?.(next);
        }}
      />
    );
  },
} satisfies Meta<typeof CustomerHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Figma frame — travelling as the main passenger. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Customer #')).toBeInTheDocument();
    await expect(canvas.getByText('5/23/1972')).toBeInTheDocument();
    const toggle = canvas.getByRole('switch', { name: 'Traveling as Guest 1/ Main PAX' });
    await expect(toggle).toBeChecked();
    await userEvent.click(canvas.getByText('Traveling as Guest 1/ Main PAX'));
    await expect(args.onTravelingAsMainChange).toHaveBeenCalledWith(false);
    await expect(toggle).not.toBeChecked();
  },
};

/** Not travelling — the customer books for others only. */
export const NotTraveling: Story = {
  args: { travelingAsMain: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('switch')).not.toBeChecked();
  },
};
