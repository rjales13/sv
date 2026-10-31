import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { InfoPreferences } from './info-preferences.tsx';

const meta = {
  title: 'Shopping/InfoPreferences',
  component: InfoPreferences,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    info: {
      propensityScore: '75%',
      pastTravels: '5',
      osVouchers: 'Yes',
      bnd: '8',
      localTime: '12:00 PM PST',
      offeredBookings: '1',
    },
    onExpandedChange: fn(),
  },
} satisfies Meta<typeof InfoPreferences>;

export default meta;
type Story = StoryObj<typeof meta>;

/** expanded — the six facts; collapses from the keyboard. */
export const Expanded: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('term')).toHaveLength(6);
    await expect(canvas.queryByRole('button', { name: /^Edit/ })).toBeNull();
    canvas.getByRole('button', { name: 'Info & preferences' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onExpandedChange).toHaveBeenCalledWith(false);
    await expect(canvas.queryByRole('term')).toBeNull();
  },
};

/** collapsed — title only. */
export const Collapsed: Story = {
  args: { expanded: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Info & preferences' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};
