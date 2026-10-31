// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import type { PriceLineStatus } from './price-line.tsx';
import { PriceLine } from './price-line.tsx';

// PriceLine is presentational. An agent scanning the grid reads a category's
// fare and its remaining inventory, so the abbreviation, the figure and the two
// stat cells must stay legible, the cells must never silently collapse, and the
// inventory status must be exposed to assistive tech rather than by colour alone.

const TIER = {
  abbrev: 'DN2',
  price: '$114,799',
} as const;

const ALL_STATUSES: PriceLineStatus[] = ['available', 'limited', 'soldout', 'disabled'];

describe('PriceLine — content', () => {
  it('renders the category abbreviation, the price and both stats', () => {
    render(<PriceLine {...TIER} statA="10" statB="4" />);
    expect(screen.getByText('DN2')).toBeInTheDocument();
    expect(screen.getByText('$114,799')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  // Money arrives pre-formatted — re-formatting here would fork the figure away
  // from every other price in the app.
  it('renders the price verbatim', () => {
    render(<PriceLine {...TIER} price="$1,234.50" />);
    expect(screen.getByText('$1,234.50')).toBeInTheDocument();
  });

  it('falls back to a dash for a stat the caller omits', () => {
    render(<PriceLine {...TIER} statA="10" />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('falls back to a dash in both cells when neither stat is supplied', () => {
    render(<PriceLine {...TIER} />);
    expect(screen.getAllByText('-')).toHaveLength(2);
  });
});

describe('PriceLine — status', () => {
  it('defaults to the available status', () => {
    const { container } = render(<PriceLine {...TIER} />);
    expect(container.firstElementChild).toHaveAttribute('data-status', 'available');
  });

  it.each(ALL_STATUSES)('exposes the %s status on the row', (status) => {
    const { container } = render(<PriceLine {...TIER} status={status} />);
    expect(container.firstElementChild).toHaveAttribute('data-status', status);
  });

  // Colour alone must not carry the inventory state (WCAG 1.4.1), so the chip
  // spells its status out for assistive tech.
  it.each([
    ['available', 'Available'],
    ['limited', 'Limited'],
    ['soldout', 'Sold out'],
    ['disabled', 'Unavailable'],
  ] as const)('spells out the %s status for assistive tech', (status, label) => {
    render(<PriceLine {...TIER} status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('keeps the abbreviation readable in every status', () => {
    for (const status of ALL_STATUSES) {
      const { unmount } = render(<PriceLine {...TIER} status={status} />);
      expect(screen.getByText('DN2')).toBeInTheDocument();
      unmount();
    }
  });
});

describe('PriceLine — selection', () => {
  it('is not selected by default', () => {
    const { container } = render(<PriceLine {...TIER} />);
    expect(container.firstElementChild).toHaveAttribute('data-selected', 'false');
  });

  it('marks the row selected when asked', () => {
    const { container } = render(<PriceLine {...TIER} selected />);
    expect(container.firstElementChild).toHaveAttribute('data-selected', 'true');
  });

  // Selection is orthogonal to inventory: a limited tier can be the selected one.
  it('combines selection with a non-default status', () => {
    const { container } = render(<PriceLine {...TIER} status="limited" selected />);
    const row = container.firstElementChild;
    expect(row).toHaveAttribute('data-status', 'limited');
    expect(row).toHaveAttribute('data-selected', 'true');
  });
});

describe('PriceLine — presentation', () => {
  it('hides the divider between the stat cells from assistive tech', () => {
    const { container } = render(<PriceLine {...TIER} statA="10" statB="4" />);
    const divider = container.querySelector('[data-slot="price-line-divider"]');
    expect(divider).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies a caller className to the row', () => {
    const { container } = render(<PriceLine {...TIER} className="w-40" />);
    expect(container.firstElementChild).toHaveClass('w-40');
  });

  it('keeps the caller className alongside the layout classes', () => {
    const { container } = render(<PriceLine {...TIER} className="w-40" />);
    expect(container.firstElementChild).toHaveClass('flex');
  });
});
