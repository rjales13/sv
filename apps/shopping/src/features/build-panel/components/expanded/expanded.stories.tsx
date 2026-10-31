import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { BuildPanelExpanded, type BuildPanelSection } from './expanded.tsx';

const cr: BuildPanelSection = {
  kind: 'cr',
  lines: [
    { variant: 'list', label: 'cr Tour Fare', amount: '$11,349.00' },
    { variant: 'discount', label: 'Past Guest Level 2 Discount', amount: '$100.00' },
    { variant: 'discount', label: 'Promo Code: AGRDN26-3 DN26 Promotion - USD', amount: '$300.00' },
    { variant: 'subtotal', label: 'cr Subtotal', amount: '$10,949.00' },
  ],
};

const HOTEL: BuildPanelSection = {
  kind: 'hotel',
  lines: [
    { variant: 'list', label: 'Milano Verticale - UNA Esperienze (POST HOTEL)', amount: '$2,229.00' },
    { variant: 'subtotal', label: 'Hotel Extensions Subtotal', amount: '$2,229.00' },
  ],
};

const meta = {
  title: 'Shopping/BuildPanelExpanded',
  component: BuildPanelExpanded,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    title: 'Paris to the Swiss Alps',
    startDate: '01 JUL 2027 (MON)',
    endDate: '12 JUL 2027 (MON)',
    details: [
      'VA Herja',
      'hrj270426t',
      '7 cr Nights / 11 Total Nights',
      'French Balcony (C) Stateroom 204',
    ],
    promoCode: 'AGRDN26-3',
    guests: [
      {
        label: 'Guest 1',
        name: 'Mr. John Smith Whitcombe',
        tpp: { eligible: true, included: true, amount: '$749.00', onIncludedChange: fn() },
        sections: [
          cr,
          HOTEL,
          {
            kind: 'air',
            lines: [
              { variant: 'list', label: 'VA Air (AUS Roundtrip) (Business D)', amount: '$6,098.00' },
              { variant: 'discount', label: 'VA Air Discounts', amount: '$400' },
              { variant: 'subtotal', label: 'VA Air Subtotal', amount: '$5,698.00' },
            ],
          },
          {
            kind: 'protection',
            lines: [{ variant: 'list', label: 'Travel Protection Plan', amount: '$749.00' }],
          },
        ],
        totalLabel: 'GUEST 1 TOTAL',
        total: '$23,984.00',
      },
      {
        label: 'Guest 2',
        name: 'Ms. Mary Stone Davis',
        tpp: { eligible: false, reason: 'Non US Resident' },
        sections: [
          cr,
          HOTEL,
          {
            kind: 'air',
            lines: [
              {
                variant: 'list',
                label: 'VA Air (YMQ Outbound - AUS Return) (Business-D)',
                amount: '$8,149.00',
              },
              { variant: 'subtotal', label: 'VA Air Subtotal', amount: '$8,149.00' },
            ],
          },
        ],
        totalLabel: 'GUEST 2 TOTAL',
        total: '$25,696.00',
      },
    ],
    grossTotal: '$49,680.00',
    currencyCode: 'USD',
    onCollapse: fn(),
    onSaveOpportunity: fn(),
    onSaveSearch: fn(),
    onBookNow: fn(),
  },
} satisfies Meta<typeof BuildPanelExpanded>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two guests — the Figma frame: one with Travel Protection, one not eligible. */
export const TwoGuests: Story = {
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const guest1 = within(canvas.getByRole('group', { name: 'Guest 1' }));
    const guest2 = within(canvas.getByRole('group', { name: 'Guest 2' }));

    await expect(guest1.getByText('$23,984.00')).toBeInTheDocument();
    await expect(guest2.getByText('TPP Non eligible guest (Non US Resident)')).toBeInTheDocument();
    await expect(canvas.getByText('PROMO CODE: AGRDN26-3')).toBeInTheDocument();

    await step('Travel Protection toggles from the checkbox label', async () => {
      await userEvent.click(guest1.getByText(/for this guest/));
      const tpp = args.guests[0]?.tpp;
      if (tpp?.eligible) await expect(tpp.onIncludedChange).toHaveBeenCalledWith(false);
    });

    await step('header and footer actions fire', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /collapse/i }));
      await userEvent.click(canvas.getByRole('button', { name: /book now/i }));
      await expect(args.onCollapse).toHaveBeenCalledTimes(1);
      await expect(args.onBookNow).toHaveBeenCalledTimes(1);
    });
  },
};

/** No promo code — the badge and its rule drop out of the header. */
export const WithoutPromoCode: Story = {
  args: { promoCode: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/PROMO CODE/)).not.toBeInTheDocument();
  },
};
