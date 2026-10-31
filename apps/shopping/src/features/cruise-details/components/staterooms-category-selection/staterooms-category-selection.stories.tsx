import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StateroomsCategorySelection } from './staterooms-category-selection';

const meta = {
  title: 'Shopping/StateroomsCategorySelection',
  component: StateroomsCategorySelection,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof StateroomsCategorySelection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default — a category has been selected; name, code and price are all present. */
export const Default: Story = {
  args: {
    categoryName: 'Deluxe Veranda',
    categoryCode: 'DV3',
    price: '$9,999',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Category Selection')).toBeInTheDocument();
    await expect(canvas.getByText('Deluxe Veranda')).toBeInTheDocument();
    await expect(canvas.getByText('DV3')).toBeInTheDocument();
    await expect(canvas.getByText('$9,999')).toBeInTheDocument();
  },
};

/** Empty — no category selected yet; em-dash placeholders are shown. */
export const Empty: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Category Selection')).toBeInTheDocument();
    // Three em-dash placeholders: name, code, price.
    const dashes = canvas.getAllByText('–');
    await expect(dashes).toHaveLength(3);
    await expect(canvas.queryByText('Deluxe Veranda')).not.toBeInTheDocument();
  },
};

/** Owners Suite — long category name that truncates within the fixed 129px body. */
export const LongName: Story = {
  args: {
    categoryName: 'Explorer Suite',
    categoryCode: 'ES1',
    price: '$24,499',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Category Selection')).toBeInTheDocument();
    await expect(canvas.getByText('Explorer Suite')).toBeInTheDocument();
    await expect(canvas.getByText('ES1')).toBeInTheDocument();
    await expect(canvas.getByText('$24,499')).toBeInTheDocument();
  },
};
