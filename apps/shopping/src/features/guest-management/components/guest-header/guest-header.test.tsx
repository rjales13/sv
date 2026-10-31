// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { GuestHeader } from './guest-header.tsx';

describe('GuestHeader — title and expansion', () => {
  it('shows the title and starts collapsed', () => {
    render(<GuestHeader title="Guest 1" />);
    expect(screen.getByText('Guest 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Guest 1' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('toggles and reports the expanded state', () => {
    const onExpandedChange = vi.fn();
    render(<GuestHeader title="Guest 1" onExpandedChange={onExpandedChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Guest 1' }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Collapse Guest 1' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('respects a controlled expanded state', () => {
    render(<GuestHeader title="Guest 1" expanded />);
    expect(screen.getByRole('button', { name: 'Collapse Guest 1' })).toBeInTheDocument();
  });

  it('draws the Figma chevron for each state', () => {
    const { container, rerender } = render(<GuestHeader title="Guest 1" expanded={false} />);
    expect(container.querySelector('[data-icon="IconNavigationExpandLess"]')).toBeTruthy();
    rerender(<GuestHeader title="Guest 1" expanded />);
    expect(container.querySelector('[data-icon="IconNavigationExpandMore"]')).toBeTruthy();
  });
});

describe('GuestHeader — Add Guest', () => {
  it('renders Add Guest only when a handler is given', () => {
    const onAddGuest = vi.fn();
    const { rerender } = render(<GuestHeader title="Guest 1" />);
    expect(screen.queryByRole('button', { name: 'Add Guest' })).not.toBeInTheDocument();

    rerender(<GuestHeader title="Guest 1" onAddGuest={onAddGuest} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Guest' }));
    expect(onAddGuest).toHaveBeenCalledTimes(1);
  });

  it('can show Add Guest disabled, as the Guest-Sidebar Disabled state does', () => {
    const onAddGuest = vi.fn();
    render(<GuestHeader title="Guest 2" onAddGuest={onAddGuest} addGuestDisabled />);
    const addGuest = screen.getByRole('button', { name: 'Add Guest' });
    expect(addGuest).toBeDisabled();
    fireEvent.click(addGuest);
    expect(onAddGuest).not.toHaveBeenCalled();
  });
});

describe('GuestHeader — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = render(<GuestHeader title="Guest 1" className="extra" />);
    expect(container.querySelector('[data-slot="guest-header"]')).toHaveClass('extra');
  });
});
