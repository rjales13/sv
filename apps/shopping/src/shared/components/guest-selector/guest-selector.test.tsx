// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../test-setup.ts';
import { GuestSelector } from './guest-selector.tsx';

const BASE_PROPS = {
  name: 'Mr. John Smith Whitcombe',
  customerNumber: '100838606001',
  birthday: '5/23/1972',
};

describe('GuestSelector — default variant', () => {
  it('renders the guest name', () => {
    render(<GuestSelector {...BASE_PROPS} />);
    expect(screen.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
  });

  it('renders the Customer # label and value', () => {
    render(<GuestSelector {...BASE_PROPS} />);
    expect(screen.getByText('Customer #')).toBeInTheDocument();
    expect(screen.getByText('100838606001')).toBeInTheDocument();
  });

  it('renders the Birthday label and value', () => {
    render(<GuestSelector {...BASE_PROPS} />);
    expect(screen.getByText('Birthday')).toBeInTheDocument();
    expect(screen.getByText('5/23/1972')).toBeInTheDocument();
  });

  it('does not render a Remove button', () => {
    render(<GuestSelector {...BASE_PROPS} />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});

describe('GuestSelector — removable variant', () => {
  it('renders the Remove button when onRemove is provided', () => {
    render(<GuestSelector {...BASE_PROPS} variant="removable" onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('does not render the Remove button when onRemove is absent', () => {
    render(<GuestSelector {...BASE_PROPS} variant="removable" />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('calls onRemove when the Remove button is clicked', async () => {
    const handler = vi.fn();
    render(<GuestSelector {...BASE_PROPS} variant="removable" onRemove={handler} />);
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('renders Birthday in removable variant', () => {
    render(<GuestSelector {...BASE_PROPS} variant="removable" onRemove={vi.fn()} />);
    expect(screen.getByText('Birthday')).toBeInTheDocument();
  });
});

describe('GuestSelector — simple variant', () => {
  it('renders the guest name', () => {
    render(
      <GuestSelector
        name="Mr. John Smith Whitcombe"
        customerNumber="100838606001"
        variant="simple"
      />,
    );
    expect(screen.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
  });

  it('renders the customer number value (no label)', () => {
    render(
      <GuestSelector
        name="Mr. John Smith Whitcombe"
        customerNumber="100838606001"
        variant="simple"
      />,
    );
    expect(screen.getByText('100838606001')).toBeInTheDocument();
    expect(screen.queryByText('Customer #')).not.toBeInTheDocument();
  });

  it('does not render Birthday section', () => {
    render(
      <GuestSelector
        name="Mr. John Smith Whitcombe"
        customerNumber="100838606001"
        birthday="5/23/1972"
        variant="simple"
      />,
    );
    expect(screen.queryByText('Birthday')).not.toBeInTheDocument();
    expect(screen.queryByText('5/23/1972')).not.toBeInTheDocument();
  });

  it('does not render a Remove button', () => {
    render(
      <GuestSelector
        name="Mr. John Smith Whitcombe"
        customerNumber="100838606001"
        variant="simple"
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});

describe('GuestSelector — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<GuestSelector {...BASE_PROPS} />);
    expect(container.querySelector('[data-slot="guest-selector"]')).toBeTruthy();
  });

  it('forwards className to the root element', () => {
    const { container } = render(<GuestSelector {...BASE_PROPS} className="extra" />);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('forwards data-testid', () => {
    render(<GuestSelector {...BASE_PROPS} data-testid="guest" />);
    expect(screen.getByTestId('guest')).toBeInTheDocument();
  });
});
