// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { InfoPreferences, type InfoPreferencesProps } from './info-preferences.tsx';

const info: InfoPreferencesProps['info'] = {
  propensityScore: '75%',
  pastTravels: '5',
  osVouchers: 'Yes',
  bnd: '8',
  localTime: '12:00 PM PST',
  offeredBookings: '1',
};

describe('InfoPreferences — expanded', () => {
  it('lists the six fields in Figma reading order', () => {
    render(<InfoPreferences info={info} />);
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Propensity Score',
      'Past Travels',
      'O/S Vouchers',
      'BND',
      'Local Time',
      'Offered Bookings',
    ]);
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual([
      '75%',
      '5',
      'Yes',
      '8',
      '12:00 PM PST',
      '1',
    ]);
  });

  it('titles the section "Info & preferences", starts expanded and has no Edit', () => {
    render(<InfoPreferences info={info} />);
    expect(screen.getByRole('button', { name: 'Info & preferences' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
  });
});

describe('InfoPreferences — collapsed', () => {
  it('collapses from the title and hides the fields', () => {
    const onExpandedChange = vi.fn();
    render(<InfoPreferences info={info} onExpandedChange={onExpandedChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Info & preferences' }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('term')).not.toBeInTheDocument();
  });

  it('respects a controlled collapsed state', () => {
    render(<InfoPreferences info={info} expanded={false} />);
    expect(screen.getByRole('button', { name: 'Info & preferences' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

describe('InfoPreferences — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = render(<InfoPreferences info={info} className="extra" />);
    expect(container.querySelector('[data-slot="info-preferences"]')).toHaveClass('extra');
  });
});
