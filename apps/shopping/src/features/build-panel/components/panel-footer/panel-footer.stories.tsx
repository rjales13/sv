import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PanelFooter } from './panel-footer';

const meta = {
  title: 'Shopping/BuildPanelFooter',
  component: PanelFooter,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="min-w-max overflow-x-auto">
        <Story />
      </div>
    ),
  ],
  args: {
    grossTotal: '$33,455.00',
    currencyCode: 'USD',
    commTotal: '$4,999.00',
    showCurrency: true,
  },
} satisfies Meta<typeof PanelFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** TA — expanded, travel-agent mode: gross total stacked above commission total. */
export const TA: Story = {
  args: { variant: 'TA' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Gross total')).toBeInTheDocument();
    await expect(canvas.getByText('$33,455.00')).toBeInTheDocument();
    await expect(canvas.getByText('Comm total')).toBeInTheDocument();
    await expect(canvas.getByText('$4,999.00')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /book now/i })).not.toBeDisabled();
  },
};

/** TACollapsed — collapsed, TA mode: BREAKDOWN toggle + gross + comm inline. */
export const TACollapsed: Story = {
  args: { variant: 'TA-collapsed' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
    await expect(canvas.getByText('Gross total')).toBeInTheDocument();
    await expect(canvas.getByText('Comm total')).toBeInTheDocument();
  },
};

/** Direct — expanded, direct customer: gross total only. */
export const Direct: Story = {
  args: { variant: 'direct' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Gross total')).toBeInTheDocument();
    await expect(canvas.queryByText('Comm total')).not.toBeInTheDocument();
  },
};

/** DirectCollapsed — collapsed, direct: BREAKDOWN toggle + gross total. */
export const DirectCollapsed: Story = {
  args: { variant: 'direct-collapsed' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
    await expect(canvas.getByText('Gross total')).toBeInTheDocument();
    await expect(canvas.queryByText('Comm total')).not.toBeInTheDocument();
  },
};

/** Recalculating — price updating after a selection change. */
export const Recalculating: Story = {
  args: { variant: 'recalculating' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

/** Zero — no price yet ($00.00 gross total). */
export const Zero: Story = {
  args: { variant: 'zero', grossTotal: '$00.00' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('$00.00')).toBeInTheDocument();
  },
};

/** Disabled — no Direct Contact or TA associated; the primary CTA is disabled. */
export const Disabled: Story = {
  args: { variant: 'disabled' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/associate a direct contact or ta to proceed/i),
    ).toBeInTheDocument();
    // Collapsed variant, so the CTA reads "Review Booking".
    await expect(canvas.getByRole('button', { name: /review booking/i })).toBeDisabled();
  },
};
