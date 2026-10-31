// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { GuestSidebar, type GuestSidebarProps } from './guest-sidebar.tsx';

const guest: NonNullable<GuestSidebarProps['guest']> = {
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

const associatedContacts: NonNullable<GuestSidebarProps['associatedContacts']> = {
  groups: [
    {
      label: 'Household members',
      contacts: [{ id: 'mary', name: 'Ms. Mary Stone Davis', customerNumber: '1008294389013' }],
    },
  ],
};

describe('GuestSidebar — Default (guest selected)', () => {
  it('shows the guest, contact details, info & preferences and associated contacts', () => {
    render(
      <GuestSidebar
        title="Guest 1 / Main PAX"
        guest={guest}
        associatedContacts={associatedContacts}
      />,
    );
    expect(screen.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Contact details' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Info & preferences' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Associated Contacts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Guest' })).not.toBeInTheDocument();
  });

  it('removes the guest from the selector', () => {
    const onRemoveGuest = vi.fn();
    render(<GuestSidebar title="Guest 1 / Main PAX" guest={guest} onRemoveGuest={onRemoveGuest} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemoveGuest).toHaveBeenCalledTimes(1);
  });

  it('collapses the body from the header', () => {
    render(<GuestSidebar title="Guest 1 / Main PAX" guest={guest} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Guest 1 / Main PAX' }));
    expect(screen.queryByText('Mr. John Smith Whitcombe')).not.toBeInTheDocument();
  });
});

describe('GuestSidebar — Empty', () => {
  it('offers Add Guest in the header and the associated-contacts dropdown', () => {
    const onAddGuest = vi.fn();
    render(
      <GuestSidebar
        title="Guest 2"
        onAddGuest={onAddGuest}
        associatedContacts={associatedContacts}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Guest' }));
    expect(onAddGuest).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox', { name: 'Associated Contacts' })).toHaveTextContent(
      'Select Guest',
    );
    expect(screen.queryByText('No guest has been added')).not.toBeInTheDocument();
  });
});

describe('GuestSidebar — Associated Contacts menu', () => {
  it('opens as guest rows and reports the picked contact', () => {
    const onValueChange = vi.fn();
    render(
      <GuestSidebar
        title="Guest 2"
        associatedContacts={{ ...associatedContacts, onValueChange }}
      />,
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Associated Contacts' }));
    expect(screen.getByRole('group', { name: 'Household members' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Mary Stone Davis/ }));
    expect(onValueChange).toHaveBeenCalledWith('mary');
  });
});

describe('GuestSidebar — Disabled', () => {
  it('disables Add Guest and the dropdown', () => {
    render(
      <GuestSidebar
        title="Guest 2"
        onAddGuest={vi.fn()}
        associatedContacts={associatedContacts}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Guest' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Associated Contacts' })).toBeDisabled();
  });
});

describe('GuestSidebar — TA, guest unselected', () => {
  it('shows the empty state with its own Add guest button and no dropdown', () => {
    const onAddGuest = vi.fn();
    render(<GuestSidebar title="Guest 1 / Main PAX" onAddGuest={onAddGuest} />);
    expect(screen.getByText('No guest has been added')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /add guest/i });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onAddGuest).toHaveBeenCalledTimes(1);
  });
});

describe('GuestSidebar — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = render(<GuestSidebar title="Guest 2" className="extra" />);
    expect(container.querySelector('[data-slot="guest-sidebar"]')).toHaveClass('extra');
  });
});
