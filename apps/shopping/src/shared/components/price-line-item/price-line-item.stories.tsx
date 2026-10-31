import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PriceLineItem } from './price-line-item.tsx';

const LABEL = 'Originating Gateway Air Add On';

const meta = {
  title: 'Shopping/PriceLineItem',
  component: PriceLineItem,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  // The row sits on a white panel in Figma; on the grey canvas the #e6e6e6 comm borders nearly vanish.
  decorators: [
    (Story) => (
      <div className="inline-block bg-surface p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    label: LABEL,
    amount: '$1,000.00',
    fare: '$10,000.00',
    commPercent: '20%',
    commission: '$100,000.00',
  },
} satisfies Meta<typeof PriceLineItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const root = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[data-slot="price-line-item"]');

/** Standard list item — label and amount. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(LABEL)).toBeInTheDocument();
    await expect(canvas.getByText('$1,000.00')).toBeInTheDocument();
    await expect(canvas.queryByText('Per Guest')).not.toBeInTheDocument();
  },
};

/** Not-eligible item — disabled label and "Not eligible". */
export const ListNA: Story = {
  args: { variant: 'list-na' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Not eligible')).toBeInTheDocument();
    await expect(canvas.queryByText('$1,000.00')).not.toBeInTheDocument();
  },
};

/** Discount item — "– label" in body text, red "– amount". */
export const Discount: Story = {
  args: { variant: 'discount' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(`– ${LABEL}`)).toBeInTheDocument();
    await expect(canvas.getByText('– $1,000.00')).toBeInTheDocument();
  },
};

/** Subtotal row — semibold label and amount with a strong top border. */
export const Subtotal: Story = {
  args: { variant: 'subtotal' },
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveStyle({ borderTopWidth: '1px' });
    await expect(within(canvasElement).queryByText('Per Guest')).not.toBeInTheDocument();
  },
};

/** Total row — semibold label + larger amount + "Per Guest" + 2px top border. */
export const Total: Story = {
  args: { variant: 'total' },
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveStyle({ borderTopWidth: '2px' });
    await expect(within(canvasElement).getByText('Per Guest')).toBeInTheDocument();
  },
};

/** Grand Total — "Grand Total" label + bold fjord-coloured amount + "Per Guest". */
export const GrandTotal: Story = {
  args: { variant: 'grand-total' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Grand Total')).toBeInTheDocument();
    await expect(canvas.queryByText(LABEL)).not.toBeInTheDocument();
    await expect(canvas.getByText('Per Guest')).toBeInTheDocument();
    await expect(root(canvasElement)).toHaveStyle({ borderTopWidth: '2px' });
  },
};

/** Commission column header row. */
export const CommHeader: Story = {
  args: { variant: 'comm-header' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('FARE')).toBeInTheDocument();
    await expect(canvas.getByText('COMM %')).toBeInTheDocument();
    await expect(canvas.getByText('COMMISSION')).toBeInTheDocument();
  },
};

/** Commission list item with all three price columns. */
export const CommList: Story = {
  args: { variant: 'comm-list' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('$10,000.00')).toBeInTheDocument();
    await expect(canvas.getByText('20%')).toBeInTheDocument();
    await expect(canvas.getByText('$100,000.00')).toBeInTheDocument();
  },
};

/** Commission not-eligible item. */
export const CommListNA: Story = {
  args: { variant: 'comm-list-na' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Not eligible')).toBeInTheDocument();
    await expect(canvas.getAllByText('—')).toHaveLength(2);
  },
};

/** Commission discount item — red fare, dashes for % and commission. */
export const CommDiscount: Story = {
  args: { variant: 'comm-discount' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('– $10,000.00')).toBeInTheDocument();
    await expect(canvas.getAllByText('—')).toHaveLength(2);
  },
};

/** Commission subtotal — semibold columns + 1px top border. */
export const CommSubtotal: Story = {
  args: { variant: 'comm-subtotal' },
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveStyle({ borderTopWidth: '1px' });
    await expect(within(canvasElement).getByText('$100,000.00')).toBeInTheDocument();
  },
};

/** Commission total — large semibold columns + 1px top border. */
export const CommTotal: Story = {
  args: { variant: 'comm-total' },
  play: async ({ canvasElement }) => {
    await expect(root(canvasElement)).toHaveStyle({ borderTopWidth: '1px' });
    await expect(within(canvasElement).getByText('$100,000.00')).toBeInTheDocument();
  },
};

const STANDARD_VARIANTS = ['list', 'list-na', 'discount', 'subtotal', 'total', 'grand-total'] as const;
const COMM_VARIANTS = [
  'comm-header',
  'comm-list',
  'comm-list-na',
  'comm-discount',
  'comm-subtotal',
  'comm-total',
] as const;

/** Every variant stacked as in the Figma frame, so the 1px vs 2px separators read side by side. */
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col">
        {STANDARD_VARIANTS.map((variant) => (
          <PriceLineItem key={variant} {...args} variant={variant} />
        ))}
      </div>
      <div className="flex flex-col">
        {COMM_VARIANTS.map((variant) => (
          <PriceLineItem key={variant} {...args} variant={variant} />
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll('[data-slot="price-line-item"]'),
    ).toHaveLength(STANDARD_VARIANTS.length + COMM_VARIANTS.length);
  },
};
