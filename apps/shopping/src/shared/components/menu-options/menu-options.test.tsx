// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../test-setup.ts';
import { MenuOptionComplex } from './menu-options.tsx';

const guest = { name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' };

describe('MenuOptionComplex — content', () => {
  it('renders the guest as a menu option', () => {
    render(<MenuOptionComplex guest={guest} />);
    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('Mr. John Smith Whitcombe');
    expect(option).toHaveTextContent('100838606001');
    expect(option.querySelector('[data-slot="guest-selector"]')).toBeTruthy();
  });
});

describe('MenuOptionComplex — states', () => {
  it('marks selection and draws the trailing check', () => {
    render(<MenuOptionComplex guest={guest} selected />);
    const option = screen.getByRole('option');
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(option.querySelector('svg')).toBeTruthy();
  });

  it('has no check when not selected', () => {
    render(<MenuOptionComplex guest={guest} />);
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option').querySelector(':scope > svg')).toBeNull();
  });

  it('is marked disabled and ignores selection', () => {
    const onSelect = vi.fn();
    render(<MenuOptionComplex guest={guest} disabled onSelect={onSelect} />);
    const option = screen.getByRole('option');
    expect(option).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(option);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('MenuOptionComplex — selection', () => {
  it('selects on click and on Enter', () => {
    const onSelect = vi.fn();
    render(<MenuOptionComplex guest={guest} onSelect={onSelect} />);
    const option = screen.getByRole('option');
    fireEvent.click(option);
    fireEvent.keyDown(option, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

describe('MenuOptionComplex — HTML forwarding', () => {
  it('merges className onto the option', () => {
    render(<MenuOptionComplex guest={guest} className="extra" />);
    expect(screen.getByRole('option')).toHaveClass('extra');
  });
});
