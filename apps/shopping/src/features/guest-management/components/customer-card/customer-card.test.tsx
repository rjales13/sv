// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { CustomerCard, type CustomerCardProps } from './customer-card.tsx';

const customer: CustomerCardProps['contact'] = {
  role: 'customer',
  name: 'Mr. John Smith Whitcombe',
  id: '100838606001',
  pastGuest: true,
};

const travelAgent: CustomerCardProps['contact'] = {
  role: 'travel-agent',
  name: 'Patty Kole',
  id: '270348',
};

// The whole header row is the single expand/collapse control.
const toggle = () => screen.getByRole('button');

describe('CustomerCard — contact', () => {
  it('shows the customer name, id, initials and Past Guest badge', () => {
    render(<CustomerCard contact={customer} guests={['Mr. Jhon Smith Whitcombe']} />);
    expect(screen.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
    expect(screen.getByText('100838606001')).toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument();
    expect(screen.getByText('Past Guest')).toBeInTheDocument();
  });

  it('omits the Past Guest badge for a first-time customer', () => {
    render(<CustomerCard contact={{ ...customer, pastGuest: false }} guests={[]} />);
    expect(screen.queryByText('Past Guest')).not.toBeInTheDocument();
  });

  it('labels a travel agent contact', () => {
    render(<CustomerCard contact={travelAgent} guests={[]} />);
    expect(screen.getByText('Patty Kole')).toBeInTheDocument();
    expect(screen.getByText('PK')).toBeInTheDocument();
    expect(screen.getByText('Travel Agent')).toBeInTheDocument();
  });

  it('shows the unselected-contact placeholder and no guest summary', () => {
    render(<CustomerCard guests={[]} />);
    expect(screen.getByText('Unselected Contact')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
    expect(screen.queryByText(/Guests/i)).not.toBeInTheDocument();
  });
});

describe('CustomerCard — guests', () => {
  it('counts and lists the guests', () => {
    render(
      <CustomerCard
        contact={customer}
        guests={['Mr. Jhon Smith Whitcombe', 'Ms. Mary Stone Davis']}
      />,
    );
    expect(screen.getByText('Guests (2)')).toBeInTheDocument();
    expect(screen.getByText('Mr. Jhon Smith Whitcombe, Ms. Mary Stone Davis')).toBeInTheDocument();
  });

  it('reads "Unselected" when no guest is chosen yet', () => {
    render(<CustomerCard contact={customer} guests={[]} />);
    expect(screen.getByText('Guests')).toBeInTheDocument();
    expect(screen.getByText('Unselected')).toBeInTheDocument();
  });
});

describe('CustomerCard — expansion', () => {
  it('toggles expanded and reports the change', () => {
    const onExpandedChange = vi.fn();
    render(<CustomerCard contact={customer} guests={[]} onExpandedChange={onExpandedChange} />);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle());
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('swaps a customer avatar for the back chevron when expanded', () => {
    const { container } = render(<CustomerCard contact={customer} guests={[]} expanded />);
    expect(screen.queryByText('JS')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="customer-card-chevron"]')).toBeTruthy();
  });

  it('keeps a travel agent avatar when expanded', () => {
    render(<CustomerCard contact={travelAgent} guests={[]} expanded />);
    expect(screen.getByText('PK')).toBeInTheDocument();
  });
});

describe('CustomerCard — HTML forwarding', () => {
  it('exposes data-slot, data-expanded and merges className', () => {
    const { container } = render(
      <CustomerCard contact={customer} guests={[]} expanded className="extra" />,
    );
    const root = container.querySelector('[data-slot="customer-card"]');
    expect(root).toHaveClass('extra');
    expect(root).toHaveAttribute('data-expanded', 'true');
  });
});
