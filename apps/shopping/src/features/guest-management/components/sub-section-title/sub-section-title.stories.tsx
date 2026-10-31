import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SubSectionTitle } from './sub-section-title.tsx';

const meta = {
  title: 'Shopping/SubSectionTitle',
  component: SubSectionTitle,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: { title: 'Contact details', onEdit: fn(), onExpandedChange: fn() },
} satisfies Meta<typeof SubSectionTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** expanded — chevron points down, Edit shown; collapses from the keyboard. */
export const Expanded: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Contact details' }));
    await expect(args.onEdit).toHaveBeenCalledTimes(1);
    canvas.getByRole('button', { name: 'Contact details' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onExpandedChange).toHaveBeenCalledWith(false);
    await expect(canvas.queryByRole('button', { name: 'Edit Contact details' })).toBeNull();
  },
};

/** collapsed — chevron points right, no Edit. */
export const Collapsed: Story = {
  args: { expanded: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Contact details' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Figma `Button` off — expanded without Edit. */
export const WithoutEdit: Story = {
  args: { onEdit: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: /^Edit/ })).toBeNull();
  },
};
