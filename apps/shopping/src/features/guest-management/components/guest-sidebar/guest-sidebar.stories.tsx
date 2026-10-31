import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { GuestSidebar } from './guest-sidebar.tsx';

const GUEST = {
  name: 'Mr. John Smith Whitcombe',
  customerNumber: '100838606001',
  birthday: '5/23/1972',
  contact: {
    email: 'john371@outlook.com',
    phone: '(781) 283-10395',
    address: '45 PINECREST AVENUE, HARRISBURG, PA 1710, United States',
  },
  info: {
    propensityScore: '75%',
    pastTravels: '5',
    osVouchers: 'Yes',
    bnd: '1',
    localTime: '12:00 PM PST',
    offeredBookings: '2',
  },
};

const CONTACTS = {
  groups: [
    {
      label: 'Household members',
      contacts: [
        { id: 'mary', name: 'Ms. Mary Stone Davis', customerNumber: '1008294389013' },
        { id: 'emily', name: 'Mrs. Emily Smith', customerNumber: '---', disabled: true },
        { id: 'clara', name: 'Ms. Clara Thompson', customerNumber: '19301394903' },
      ],
    },
    {
      label: 'Other associated contacts',
      contacts: [
        { id: 'thomas', name: 'Mr. Thomas Andrew Blake', customerNumber: '19301394903' },
        { id: 'annie', name: 'Annie Fisher', customerNumber: '193013948134' },
      ],
    },
  ],
};

const meta = {
  title: 'Shopping/GuestSidebar',
  component: GuestSidebar,
  parameters: {
    layout: 'padded',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  decorators: [
    (Story) => (
      <div className="w-fit bg-surface">
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Guest 1 / Main PAX',
    onAddGuest: fn(),
    onRemoveGuest: fn(),
    onEditContact: fn(),
  },
} satisfies Meta<typeof GuestSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — the selected guest with details and the associated-contacts dropdown. */
export const Default: Story = {
  args: { guest: GUEST, associatedContacts: CONTACTS },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove' }));
    await expect(args.onRemoveGuest).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Contact details' }));
    await expect(args.onEditContact).toHaveBeenCalledTimes(1);
    await expect(canvas.getByRole('combobox', { name: 'Associated Contacts' })).toBeEnabled();
  },
};

/** Empty — Guest 2 not chosen yet: Add Guest in the header plus the dropdown. */
export const Empty: Story = {
  args: { title: 'Guest 2', associatedContacts: CONTACTS },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Add Guest' }));
    await expect(args.onAddGuest).toHaveBeenCalledTimes(1);
  },
};

/** Empty with the Associated Contacts menu open — grouped guest rows, one chosen. */
export const AssociatedContactsOpen: Story = {
  args: { title: 'Guest 2', associatedContacts: { ...CONTACTS, onValueChange: fn() } },
  render: function AssociatedContactsOpen(args) {
    const [value, setValue] = useState('mary');
    return (
      <GuestSidebar
        {...args}
        associatedContacts={{
          ...CONTACTS,
          value,
          onValueChange: (id) => {
            setValue(id);
            args.associatedContacts?.onValueChange?.(id);
          },
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Associated Contacts' }));
    await expect(body.getByRole('option', { name: /Mary Stone Davis/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(body.getByRole('option', { name: /Emily Smith/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(body.getByRole('option', { name: /Thomas Andrew Blake/ }));
    await expect(args.associatedContacts?.onValueChange).toHaveBeenCalledWith('thomas');
    await expect(canvas.getByRole('combobox', { name: 'Associated Contacts' })).toHaveTextContent(
      'Mr. Thomas Andrew Blake',
    );
    // Leave the menu open so the story shows the expanded state.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Associated Contacts' }));
  },
};

/** A household with more contacts than fit on screen — the menu stays in view and scrolls. */
export const AssociatedContactsLongList: Story = {
  args: {
    title: 'Guest 2',
    associatedContacts: {
      groups: [
        {
          label: 'Household members',
          contacts: Array.from({ length: 20 }, (_, i) => ({
            id: `member-${i + 1}`,
            name: `Household Member ${i + 1}`,
            customerNumber: `10082943890${String(i + 1).padStart(2, '0')}`,
          })),
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Associated Contacts' }));
    const listbox = await body.findByRole('listbox');
    const panel = listbox.closest('[data-slot="popover-content"]') ?? listbox;
    await expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    await expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight);
    const last = body.getByRole('option', { name: /Household Member 20/ });
    last.scrollIntoView({ block: 'nearest' });
    await expect(listbox.scrollTop).toBeGreaterThan(0);
  },
};

/** Disabled — Add Guest and the dropdown greyed out. */
export const Disabled: Story = {
  args: { title: 'Guest 2', associatedContacts: CONTACTS, disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Add Guest' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Associated Contacts' })).toBeDisabled();
  },
};

/** TA-GuestUnselected — a travel agent booking with no guest yet. */
export const TravelAgentGuestUnselected: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No guest has been added')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /add guest/i }));
    await expect(args.onAddGuest).toHaveBeenCalledTimes(1);
  },
};
