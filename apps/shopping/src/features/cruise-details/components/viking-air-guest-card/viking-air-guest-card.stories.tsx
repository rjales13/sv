import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  VikingAirGuestCard,
  type VikingAirGuestCardProps,
  type VikingAirGuestCardSelection,
} from './viking-air-guest-card.tsx';

const COPY_LABEL = 'Use the same information for Guest 2';

const meta = {
  title: 'Shopping/VikingAirGuestCard',
  component: VikingAirGuestCard,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  args: {
    title: 'Guest 1 / Main PAX',
    guest: { name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' },
    includeAirfare: true,
    gatewayOptions: [
      { value: 'SEA', label: 'Seattle (SEA)' },
      { value: 'LAX', label: 'Los Angeles (LAX)' },
    ],
    classOptions: [
      { value: 'economy', label: 'Economy' },
      { value: 'business', label: 'Business' },
    ],
    onExpandedChange: fn(),
    onIncludeAirfareChange: fn(),
    onSelectionChange: fn(),
  },
  // Holds the card's state so the toggle, selects and checkbox respond in the canvas.
  render: function StatefulCard(args: VikingAirGuestCardProps) {
    const [includeAirfare, setIncludeAirfare] = useState(args.includeAirfare);
    const [selection, setSelection] = useState<VikingAirGuestCardSelection>(args.selection ?? {});
    const [copied, setCopied] = useState(args.copyToNextGuest?.checked ?? false);
    return (
      <VikingAirGuestCard
        {...args}
        includeAirfare={includeAirfare}
        onIncludeAirfareChange={(next) => {
          setIncludeAirfare(next);
          args.onIncludeAirfareChange?.(next);
        }}
        selection={selection}
        onSelectionChange={(next) => {
          setSelection(next);
          args.onSelectionChange?.(next);
        }}
        {...(args.copyToNextGuest && {
          copyToNextGuest: { ...args.copyToNextGuest, checked: copied, onCheckedChange: setCopied },
        })}
      />
    );
  },
} satisfies Meta<typeof VikingAirGuestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Guest 1 — the main passenger, with the option to copy their choices to Guest 2. */
export const Guest1: Story = {
  args: { copyToNextGuest: { label: COPY_LABEL, checked: true } },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('switch', { name: 'Include Airfare' })).toBeChecked();
    await expect(canvas.getAllByRole('combobox')).toHaveLength(4);
    await expect(canvas.getByRole('checkbox', { name: COPY_LABEL })).toBeChecked();

    await step('turning airfare off switches to the not-included summary', async () => {
      await userEvent.click(canvas.getByRole('switch', { name: 'Include Airfare' }));
      await expect(args.onIncludeAirfareChange).toHaveBeenCalledWith(false);
      await expect(canvas.getByText('Viking Air is not included')).toBeInTheDocument();
      await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
    });

    await step('the header collapses the card from the keyboard', async () => {
      const toggle = canvas.getByRole('button', { name: 'Collapse Guest 1 / Main PAX' });
      toggle.focus();
      await userEvent.keyboard('{Enter}');
      await expect(args.onExpandedChange).toHaveBeenCalledWith(false);
      await expect(canvas.queryByRole('switch')).not.toBeInTheDocument();
    });
  },
};

/** Guest 2 — same fields, no copy checkbox. */
export const Guest2: Story = {
  args: {
    title: 'Guest 2',
    guest: { name: 'Mary Stone Davis', customerNumber: '1008294389013' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Guest 2' })).toBeInTheDocument();
    await expect(canvas.getByText('Mary Stone Davis')).toBeInTheDocument();
    await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
  },
};

/** Collapsed — header only. */
export const Collapsed: Story = {
  args: { expanded: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: 'Expand Guest 1 / Main PAX' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByText('Mr. John Smith Whitcombe')).not.toBeInTheDocument();
  },
};

/** No Viking Air — the guest declined airfare. */
export const NoVikingAir: Story = {
  args: { includeAirfare: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('switch', { name: 'Include Airfare' })).not.toBeChecked();
    await expect(canvas.getByText('Viking Air is not included')).toBeInTheDocument();
    await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
  },
};

/** Disabled — every control locked; the header still collapses. */
export const Disabled: Story = {
  args: { disabled: true, copyToNextGuest: { label: COPY_LABEL, checked: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('switch', { name: 'Include Airfare' })).toBeDisabled();
    for (const select of canvas.getAllByRole('combobox')) await expect(select).toBeDisabled();
    await expect(canvas.getByRole('checkbox', { name: COPY_LABEL })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: /Collapse/ })).toBeEnabled();
  },
};

/** Summarized — a priced guest. */
export const Summarized: Story = {
  args: {
    selection: {
      originGateway: 'SEA',
      originClass: 'economy',
      returnGateway: 'SEA',
      returnClass: 'economy',
    },
    summary: { variant: 'summarized', airfare: '$9,595.00', discount: '$700.00', total: '$8,895.00' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('Seattle (SEA)')).toHaveLength(2);
    await expect(canvas.getByText('$8,895.00')).toBeInTheDocument();
  },
};
