import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ContactDetails } from './contact-details.tsx';

const meta = {
  title: 'Shopping/ContactDetails',
  component: ContactDetails,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    contact: {
      email: 'john371@outlook.com',
      phone: '(781) 283-10395',
      address: '45 PINECREST AVENUE, HARRISBURG, PA 1710, United States',
    },
    onEdit: fn(),
    onExpandedChange: fn(),
  },
} satisfies Meta<typeof ContactDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — expanded with Edit; collapses from the title. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Email',
      'Phone',
      'Address',
    ]);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Contact details' }));
    await expect(args.onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Contact details' }));
    await expect(args.onExpandedChange).toHaveBeenCalledWith(false);
    await expect(canvas.queryByRole('term')).toBeNull();
  },
};

/** collapsed — title only. */
export const Collapsed: Story = {
  args: { expanded: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Contact details' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};
