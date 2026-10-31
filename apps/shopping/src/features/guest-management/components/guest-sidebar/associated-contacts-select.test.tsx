// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import {
  AssociatedContactsSelect,
  type AssociatedContactsSelectProps,
} from './associated-contacts-select.tsx';

const groups: AssociatedContactsSelectProps['groups'] = [
  {
    label: 'Household members',
    contacts: [
      { id: 'mary', name: 'Ms. Mary Stone Davis', customerNumber: '1008294389013' },
      { id: 'emily', name: 'Mrs. Emily Smith', customerNumber: '---', disabled: true },
    ],
  },
  {
    label: 'Other associated contacts',
    contacts: [{ id: 'thomas', name: 'Mr. Thomas Andrew Blake', customerNumber: '19301394903' }],
  },
];

function openMenu() {
  fireEvent.click(screen.getByRole('combobox', { name: 'Associated Contacts' }));
}

describe('AssociatedContactsSelect — trigger', () => {
  it('shows the placeholder until a contact is chosen', () => {
    render(<AssociatedContactsSelect groups={groups} aria-label="Associated Contacts" />);
    expect(screen.getByRole('combobox', { name: 'Associated Contacts' })).toHaveTextContent(
      'Select Guest',
    );
  });

  it('shows the chosen contact name', () => {
    render(
      <AssociatedContactsSelect groups={groups} value="mary" aria-label="Associated Contacts" />,
    );
    expect(screen.getByRole('combobox', { name: 'Associated Contacts' })).toHaveTextContent(
      'Ms. Mary Stone Davis',
    );
  });

  it('does not open while disabled', () => {
    render(<AssociatedContactsSelect groups={groups} disabled aria-label="Associated Contacts" />);
    openMenu();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('AssociatedContactsSelect — menu', () => {
  it('lists each group under its header, one guest row per contact', () => {
    render(<AssociatedContactsSelect groups={groups} aria-label="Associated Contacts" />);
    openMenu();
    expect(screen.getByRole('group', { name: 'Household members' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Other associated contacts' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: /Mr\. Thomas Andrew Blake/ })).toHaveTextContent(
      '19301394903',
    );
  });

  it('marks the chosen contact selected and a disabled contact unavailable', () => {
    render(
      <AssociatedContactsSelect groups={groups} value="mary" aria-label="Associated Contacts" />,
    );
    openMenu();
    expect(screen.getByRole('option', { name: /Mary Stone Davis/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: /Emily Smith/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('reports the picked contact and closes', () => {
    const onValueChange = vi.fn();
    render(
      <AssociatedContactsSelect
        groups={groups}
        onValueChange={onValueChange}
        aria-label="Associated Contacts"
      />,
    );
    openMenu();
    fireEvent.click(screen.getByRole('option', { name: /Thomas Andrew Blake/ }));
    expect(onValueChange).toHaveBeenCalledWith('thomas');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ignores a click on a disabled contact', () => {
    const onValueChange = vi.fn();
    render(
      <AssociatedContactsSelect
        groups={groups}
        onValueChange={onValueChange}
        aria-label="Associated Contacts"
      />,
    );
    openMenu();
    fireEvent.click(screen.getByRole('option', { name: /Emily Smith/ }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
