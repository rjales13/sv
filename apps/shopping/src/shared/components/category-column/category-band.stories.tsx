import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CategoryBand } from './category-band';
import type { CategoryColumnProps } from './category-column';

const column = (title: string, prefix: string, tiers = 3): CategoryColumnProps => ({
  title,
  items: Array.from({ length: tiers }, (_, i) => ({
    abbrev: `${prefix}${i + 1}`,
    price: `$${(120 - i * 7).toString()},499`,
    statA: String(12 - i * 3),
    ...(i === 1 ? { status: 'limited' as const } : {}),
  })),
});

const meta = {
  title: 'Shopping/CategoryBand',
  component: CategoryBand,
  parameters: { layout: 'padded' },
  args: {
    columns: [
      column('Owners Suite', 'OS'),
      column('Explorer Suite', 'EX'),
      column('Deluxe Veranda', 'DV'),
    ],
  },
} satisfies Meta<typeof CategoryBand>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ThreeColumns — the design's 3-column variant. */
export const ThreeColumns: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Owners Suite')).toBeInTheDocument();
    await expect(canvas.getByText('Deluxe Veranda')).toBeInTheDocument();
  },
};

/** SixColumns — column count is data, not a variant; the band just takes a longer array. */
export const SixColumns: Story = {
  args: {
    columns: [
      column('Owners Suite', 'OS'),
      column('Explorer Suite', 'EX'),
      column('Penthouse Jr. Suite', 'PJ'),
      column('Penthouse Veranda', 'PV'),
      column('Deluxe Veranda', 'DV'),
      column('Veranda', 'V'),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Veranda')).toBeInTheDocument();
  },
};

/** UnevenTiers — columns of differing height; the rules still span the tallest. */
export const UnevenTiers: Story = {
  args: {
    columns: [
      column('Owners Suite', 'OS', 4),
      column('Explorer Suite', 'EX', 2),
      column('Deluxe Veranda', 'DV', 3),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('OS4')).toBeInTheDocument();
  },
};

/** SingleColumn — a lone category must not render a dangling rule beside it. */
export const SingleColumn: Story = {
  args: { columns: [column('Owners Suite', 'OS')] },
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.getByText('Owners Suite')).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('[data-slot="separator"]')).toHaveLength(0);
  },
};
