import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { RemainingCount } from './remaining-count';

/*
  RemainingCount — ShoppingApp_UX-VD node 3060:129349.
  Two variants from Figma: more9 (navy) and less9 (red).
*/

const meta = {
  title: 'Shopping/RemainingCount',
  component: RemainingCount,
  parameters: {
    layout: 'centered',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
} satisfies Meta<typeof RemainingCount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma Property 1=more9 — 9 or more remaining, navy text. */
export const MoreThan9: Story = {
  args: { count: '9+ remaining' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('9+ remaining')).toBeVisible();
    await expect(canvas.queryByText('Low availability')).toBeNull();
  },
};

/** Figma Property 1=less9 — fewer than 9 remaining, red text + sr-only warning. */
export const LessThan9: Story = {
  args: { count: '7 remaining', lowInventory: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('7 remaining')).toBeVisible();
  },
};
