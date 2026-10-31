// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { PriceCurrency } from './price-currency.tsx';

// PriceCurrency is presentational and stateless: each variant is a distinct
// render branch, so these tests pin what each one puts on screen. The value
// worth protecting is which figures and labels a sales agent actually sees —
// quoting a commission figure as a gross total, or showing a stale price while
// a quote is re-pricing, are the failures that matter on a live call.

describe('PriceCurrency — default', () => {
  it('prefixes the figure with "Starting at"', () => {
    render(<PriceCurrency variant="default" amount="$4,999.00" />);
    expect(screen.getByText('Starting at')).toBeInTheDocument();
    expect(screen.getByText('$4,999.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('is the variant used when none is supplied', () => {
    render(<PriceCurrency amount="$1,200.00" />);
    expect(screen.getByText('Starting at')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
  });

  it('renders the caller-supplied currency code verbatim', () => {
    render(<PriceCurrency variant="default" currencyCode="GBP" />);
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.queryByText('USD')).not.toBeInTheDocument();
  });
});

describe('PriceCurrency — base', () => {
  it('renders the figure with no "Starting at" prefix', () => {
    render(<PriceCurrency variant="base" amount="$4,999.00" />);
    expect(screen.getByText('$4,999.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.queryByText('Starting at')).not.toBeInTheDocument();
  });
});

describe('PriceCurrency — total', () => {
  it('labels the figure as the gross total', () => {
    render(<PriceCurrency variant="total" amount="$4,999.00" />);
    expect(screen.getByText('Gross total')).toBeInTheDocument();
    expect(screen.getByText('$4,999.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('does not carry the "Starting at" prefix', () => {
    render(<PriceCurrency variant="total" />);
    expect(screen.queryByText('Starting at')).not.toBeInTheDocument();
  });
});

describe('PriceCurrency — comm-total', () => {
  // Commission and gross are different numbers to a sales agent; the label
  // is the only thing distinguishing them, so it must never read "Gross total".
  it('labels the figure as the commission total, not the gross', () => {
    render(<PriceCurrency variant="comm-total" amount="$499.00" />);
    expect(screen.getByText('Comm total')).toBeInTheDocument();
    expect(screen.getByText('$499.00')).toBeInTheDocument();
    expect(screen.queryByText('Gross total')).not.toBeInTheDocument();
  });
});

describe('PriceCurrency — recalculating', () => {
  it('replaces the figure with a spinner while the quote is in flight', () => {
    render(<PriceCurrency variant="recalculating" amount="$4,999.00" />);
    expect(screen.getByText('Gross total')).toBeInTheDocument();
    expect(screen.getByText('Recalculating…')).toBeInTheDocument();
    // A stale figure shown mid-recalculation would be quoted to the customer.
    expect(screen.queryByText('$4,999.00')).not.toBeInTheDocument();
  });

  it('exposes the in-flight state to assistive tech', () => {
    const { container } = render(<PriceCurrency variant="recalculating" />);
    const region = container.firstElementChild;
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });
});

describe('PriceCurrency — sold', () => {
  it('shows the sold-out badge and no price at all', () => {
    render(<PriceCurrency variant="sold" amount="$4,999.00" />);
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
    expect(screen.queryByText('$4,999.00')).not.toBeInTheDocument();
    expect(screen.queryByText('USD')).not.toBeInTheDocument();
  });
});

describe('PriceCurrency — showCurrency', () => {
  it.each(['default', 'base', 'total', 'comm-total'] as const)(
    'hides the currency code on the %s variant when showCurrency is false',
    (variant) => {
      render(<PriceCurrency variant={variant} amount="$4,999.00" showCurrency={false} />);
      expect(screen.getByText('$4,999.00')).toBeInTheDocument();
      expect(screen.queryByText('USD')).not.toBeInTheDocument();
    },
  );

  it.each(['default', 'base', 'total', 'comm-total'] as const)(
    'shows the currency code on the %s variant by default',
    (variant) => {
      render(<PriceCurrency variant={variant} amount="$4,999.00" />);
      expect(screen.getByText('USD')).toBeInTheDocument();
    },
  );
});

describe('PriceCurrency — className passthrough', () => {
  it.each(['default', 'base', 'total', 'comm-total', 'recalculating', 'sold'] as const)(
    'applies a caller className on the %s variant',
    (variant) => {
      const { container } = render(<PriceCurrency variant={variant} className="mt-4" />);
      expect(container.firstElementChild).toHaveClass('mt-4');
    },
  );
});
