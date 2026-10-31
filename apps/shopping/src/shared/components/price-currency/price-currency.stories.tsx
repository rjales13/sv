import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PriceCurrency } from './price-currency';

/*
  PriceCurrency — cruise price block (ShoppingApp_UX-VD, node 1781:167043).

  Each story covers:
    • A11y        — axe runs automatically via @storybook/addon-a11y after play().
    • Interaction — play() asserts the rendered content for each variant.

  PriceCurrency is purely presentational — it owns no state and has no controls,
  so play() verifies what each variant renders rather than driving events.
*/

const meta = {
  title: 'Shopping/PriceCurrency',
  component: PriceCurrency,
  parameters: { layout: 'padded' },
  args: {
    amount: '$4,999.00',
    currencyCode: 'USD',
    showCurrency: true,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'base', 'total', 'comm-total', 'recalculating', 'sold'],
    },
  },
} satisfies Meta<typeof PriceCurrency>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — "Starting at" prefix, 18px price, currency overline. */
export const Default: Story = {
  args: { variant: 'default' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Starting at')).toBeInTheDocument();
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
    await expect(canvas.getByText('USD')).toBeInTheDocument();
  },
};

/** Base — price and currency only, no prefix. */
export const Base: Story = {
  args: { variant: 'base' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
    await expect(canvas.queryByText('Starting at')).not.toBeInTheDocument();
  },
};

/** Total — "Gross total" eyebrow with the larger 20px figure. */
export const Total: Story = {
  args: { variant: 'total' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Gross total')).toBeInTheDocument();
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
  },
};

/** CommTotal — commission line; smaller figure, all secondary ink. */
export const CommTotal: Story = {
  args: { variant: 'comm-total' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Comm total')).toBeInTheDocument();
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
  },
};

/** Recalculating — quote is being re-priced; spinner replaces the figure. */
export const Recalculating: Story = {
  args: { variant: 'recalculating' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Gross total')).toBeInTheDocument();
    await expect(canvas.getByText('Recalculating…')).toBeInTheDocument();
    // The Spinner carries role="status" / aria-label="Loading".
    await expect(canvas.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    // No price is shown while the quote is in flight.
    await expect(canvas.queryByText('$4,999.00')).not.toBeInTheDocument();
  },
};

/** Sold — no price at all; renders the DS AvailabilityBadge. */
export const Sold: Story = {
  args: { variant: 'sold' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/sold out/i)).toBeInTheDocument();
    await expect(canvas.queryByText('$4,999.00')).not.toBeInTheDocument();
  },
};

/** WithoutCurrency — `showCurrency={false}` hides the currency code. */
export const WithoutCurrency: Story = {
  args: { variant: 'default', showCurrency: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
    await expect(canvas.queryByText('USD')).not.toBeInTheDocument();
  },
};
