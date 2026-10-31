import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { RouteIndicator } from './route-indicator';

/*
  RouteIndicator — ShoppingApp_UX-VD node 3060:129339.
  Figma variants: default (Paris → Zürich) and roundtrip (Paris ⇌ Roundtrip).
*/

const meta = {
  title: 'Shopping/RouteIndicator',
  component: RouteIndicator,
  parameters: {
    layout: 'centered',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: { from: 'Paris', to: 'Zürich' },
} satisfies Meta<typeof RouteIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma Property 1=default — point-to-point with forward arrow. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Paris')).toBeVisible();
    await expect(canvas.getByText('Zürich')).toBeVisible();
    await expect(canvas.getByText('to')).toBeInTheDocument();
  },
};

/** Figma Property 1=roundtrip — sync icon and "Roundtrip" label. */
export const Roundtrip: Story = {
  args: { roundtrip: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Paris')).toBeVisible();
    await expect(canvas.getByText('Roundtrip')).toBeVisible();
    await expect(canvas.queryByText('to')).toBeNull();
  },
};
