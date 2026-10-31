// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { CustomerHeader, type CustomerHeaderProps } from './customer-header.tsx';

const guest: CustomerHeaderProps['guest'] = {
  name: 'Mr. John Smith Whitcombe',
  customerNumber: '100838606001',
  birthday: '5/23/1972',
};

describe('CustomerHeader', () => {
  it('shows the guest name, customer number and birthday', () => {
    render(<CustomerHeader guest={guest} travelingAsMain />);
    expect(screen.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
    expect(screen.getByText('100838606001')).toBeInTheDocument();
    expect(screen.getByText('5/23/1972')).toBeInTheDocument();
  });

  it('has no Remove control — the header guest is not removable', () => {
    render(<CustomerHeader guest={guest} travelingAsMain />);
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('labels the switch and reflects the main-passenger state', () => {
    const { rerender } = render(<CustomerHeader guest={guest} travelingAsMain />);
    const toggle = screen.getByRole('switch', { name: 'Traveling as Guest 1/ Main PAX' });
    expect(toggle).toBeChecked();
    rerender(<CustomerHeader guest={guest} travelingAsMain={false} />);
    expect(toggle).not.toBeChecked();
  });

  it('reports toggling the main-passenger switch', () => {
    const onTravelingAsMainChange = vi.fn();
    render(
      <CustomerHeader
        guest={guest}
        travelingAsMain
        onTravelingAsMainChange={onTravelingAsMainChange}
      />,
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onTravelingAsMainChange).toHaveBeenCalledWith(false);
  });

  it('exposes data-slot and merges className', () => {
    const { container } = render(
      <CustomerHeader guest={guest} travelingAsMain className="extra" />,
    );
    expect(container.querySelector('[data-slot="customer-header"]')).toHaveClass('extra');
  });
});
