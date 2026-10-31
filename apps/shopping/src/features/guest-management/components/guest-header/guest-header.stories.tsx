import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { GuestHeader } from './guest-header.tsx';

const meta = {
  title: 'Shopping/GuestHeader',
  component: GuestHeader,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: { title: 'Guest 1', onAddGuest: fn(), onExpandedChange: fn() },
} satisfies Meta<typeof GuestHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** collapse — chevron points down; toggles open from the keyboard. */
export const Collapsed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add Guest' }));
    await expect(args.onAddGuest).toHaveBeenCalledTimes(1);
    canvas.getByRole('button', { name: 'Expand Guest 1' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onExpandedChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole('button', { name: 'Collapse Guest 1' })).toBeInTheDocument();
  },
};

/** expanded — chevron points up. */
export const Expanded: Story = {
  args: { expanded: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Collapse Guest 1' }),
    ).toHaveAttribute('aria-expanded', 'true');
  },
};

/** Figma `button` off — no Add Guest. */
export const WithoutAddGuest: Story = {
  args: { onAddGuest: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Add Guest' })).toBeNull();
  },
};
