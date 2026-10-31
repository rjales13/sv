import { DropdownMenu } from '@vikings/ui/components/dropdown-menu';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MenuOptionComplex } from './menu-options.tsx';

const GUEST = { name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' };

const meta = {
  title: 'Shopping/MenuOptionComplex',
  component: MenuOptionComplex,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  // role="option" needs a listbox parent; DropdownMenu provides it.
  decorators: [
    (Story) => (
      <DropdownMenu aria-label="Guests" className="w-fit">
        <Story />
      </DropdownMenu>
    ),
  ],
  args: { guest: GUEST, onSelect: fn() },
} satisfies Meta<typeof MenuOptionComplex>;

export default meta;
type Story = StoryObj<typeof meta>;

/** s-default — selects on click. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const option = within(canvasElement).getByRole('option');
    await userEvent.click(option);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

/** s-selected — pale blue with the trailing check. */
export const Selected: Story = {
  args: { selected: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('option')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

/** s-disabled — greyed, not selectable. */
export const Disabled: Story = {
  args: { disabled: true },
  // The row takes no pointer events, so a click cannot reach it — assert that directly.
  play: async ({ canvasElement }) => {
    const option = within(canvasElement).getByRole('option');
    await expect(option).toHaveAttribute('aria-disabled', 'true');
    await expect(getComputedStyle(option).pointerEvents).toBe('none');
    await expect(option).toHaveAttribute('tabindex', '-1');
  },
};

/** A guest list — arrow keys move focus, Enter selects. */
export const GuestList: Story = {
  render: function GuestList() {
    const guests = [
      { id: 'g1', name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' },
      { id: 'g2', name: 'Ms. Mary Stone Davis', customerNumber: '1008294389013' },
      { id: 'g3', name: 'Mr. Idris Kaya', customerNumber: '100838606003' },
    ];
    const [selectedId, setSelectedId] = useState('g1');
    return (
      <>
        {guests.map((g) => (
          <MenuOptionComplex
            key={g.id}
            guest={g}
            selected={g.id === selectedId}
            disabled={g.id === 'g3'}
            onSelect={() => setSelectedId(g.id)}
          />
        ))}
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const options = within(canvasElement).getAllByRole('option');
    options[0]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(options[1]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(options[1]).toHaveAttribute('aria-selected', 'true');
  },
};
