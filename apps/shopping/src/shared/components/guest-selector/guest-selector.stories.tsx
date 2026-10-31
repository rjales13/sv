import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { GuestSelector } from './guest-selector.tsx';

const meta = {
  title: 'Shopping/GuestSelector',
  component: GuestSelector,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    name: 'Mr. John Smith Whitcombe',
    customerNumber: '100838606001',
    birthday: '5/23/1972',
  },
} satisfies Meta<typeof GuestSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — name, customer number, and birthday. No remove button. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
    await expect(canvas.getByText('Customer #')).toBeInTheDocument();
    await expect(canvas.getByText('100838606001')).toBeInTheDocument();
    await expect(canvas.getByText('Birthday')).toBeInTheDocument();
    await expect(canvas.getByText('5/23/1972')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  },
};

/** Removable — default fields plus a Remove button. */
export const Removable: Story = {
  args: {
    variant: 'removable',
    onRemove: fn(),
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const remove = canvas.getByRole('button', { name: 'Remove' });

    await step('removes on click', async () => {
      await userEvent.click(remove);
      await expect(args.onRemove).toHaveBeenCalledTimes(1);
    });

    await step('is reachable and operable from the keyboard', async () => {
      remove.blur();
      await userEvent.tab();
      await expect(remove).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      await expect(args.onRemove).toHaveBeenCalledTimes(3);
    });
  },
};

/** Simple — compact row showing only name and customer number. */
export const Simple: Story = {
  args: {
    variant: 'simple',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('100838606001')).toBeInTheDocument();
    await expect(canvas.queryByText('Customer #')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Birthday')).not.toBeInTheDocument();
    await expect(canvas.queryByText('5/23/1972')).not.toBeInTheDocument();
  },
};

/** Removable without onRemove — the Remove button is hidden. */
export const RemovableHidden: Story = {
  args: {
    variant: 'removable',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  },
};
