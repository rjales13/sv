// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import type { CategoryColumnItem } from './category-column.tsx';
import { CategoryColumn } from './category-column.tsx';

// A column is one stateroom category in the fare grid. An agent scans across
// columns comparing tiers, so the category name must stay tied to its own rows
// and the rows must keep their order and their per-tier inventory state.

const TIERS: CategoryColumnItem[] = [
  { abbrev: 'DN2', price: '$114,799', statA: '10' },
  { abbrev: 'DN1', price: '$98,500', statA: '4', status: 'limited' },
];

describe('CategoryColumn — content', () => {
  it('renders the category name', () => {
    render(<CategoryColumn title="Owners Suite" items={TIERS} />);
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
  });

  it('renders every tier it is given', () => {
    render(<CategoryColumn title="Owners Suite" items={TIERS} />);
    expect(screen.getByText('DN2')).toBeInTheDocument();
    expect(screen.getByText('$114,799')).toBeInTheDocument();
    expect(screen.getByText('DN1')).toBeInTheDocument();
    expect(screen.getByText('$98,500')).toBeInTheDocument();
  });

  it('renders exactly one row per item', () => {
    const { container } = render(<CategoryColumn title="Owners Suite" items={TIERS} />);
    expect(container.querySelectorAll('[data-slot="price-line"]')).toHaveLength(2);
  });

  it('keeps the tiers in the order given', () => {
    const { container } = render(<CategoryColumn title="Owners Suite" items={TIERS} />);
    const rows = [...container.querySelectorAll('[data-slot="price-line"]')];
    expect(within(rows[0] as HTMLElement).getByText('DN2')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('DN1')).toBeInTheDocument();
  });

  // Inventory state belongs to the individual tier, not the column, so it must
  // reach the right row rather than being applied across the stack.
  it('forwards each tier its own status', () => {
    const { container } = render(<CategoryColumn title="Owners Suite" items={TIERS} />);
    const rows = [...container.querySelectorAll('[data-slot="price-line"]')];
    expect(rows[0]).toHaveAttribute('data-status', 'available');
    expect(rows[1]).toHaveAttribute('data-status', 'limited');
  });

  it('forwards selection to the chosen tier only', () => {
    const items: CategoryColumnItem[] = [
      { abbrev: 'DN2', price: '$114,799' },
      { abbrev: 'DN1', price: '$98,500', selected: true },
    ];
    const { container } = render(<CategoryColumn title="Owners Suite" items={items} />);
    const rows = [...container.querySelectorAll('[data-slot="price-line"]')];
    expect(rows[0]).toHaveAttribute('data-selected', 'false');
    expect(rows[1]).toHaveAttribute('data-selected', 'true');
  });

  // A category with no bookable tiers still has to hold its column width in the
  // band, otherwise the neighbouring columns shift under it.
  it('renders the title and no rows when there are no tiers', () => {
    const { container } = render(<CategoryColumn title="Owners Suite" items={[]} />);
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="price-line"]')).toHaveLength(0);
  });
});

describe('CategoryColumn — accessibility', () => {
  // Without this the category name is only visually associated with its rows;
  // a screen reader entering the column would hear prices with no category.
  it('exposes a group named by the category', () => {
    render(<CategoryColumn title="Owners Suite" items={TIERS} />);
    expect(screen.getByRole('group', { name: 'Owners Suite' })).toBeInTheDocument();
  });

  it('gives each column its own label when several are rendered', () => {
    render(
      <>
        <CategoryColumn title="Owners Suite" items={TIERS} />
        <CategoryColumn title="Deluxe Veranda" items={TIERS} />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Owners Suite' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Deluxe Veranda' })).toBeInTheDocument();
  });
});

describe('CategoryColumn — presentation', () => {
  // The title block is a fixed height so every column's first row starts on the
  // same line; a wrapping title would knock the whole band out of alignment.
  it('keeps a long category name on one line', () => {
    const { container } = render(
      <CategoryColumn title="Penthouse Junior Suite With A Very Long Name" items={TIERS} />,
    );
    const title = container.querySelector('[data-slot="category-column-title"]');
    expect(title).toHaveClass('truncate');
  });

  it('applies a caller className to the column', () => {
    const { container } = render(
      <CategoryColumn title="Owners Suite" items={TIERS} className="w-40" />,
    );
    expect(container.firstElementChild).toHaveClass('w-40');
  });

  it('keeps the caller className alongside the layout classes', () => {
    const { container } = render(
      <CategoryColumn title="Owners Suite" items={TIERS} className="w-40" />,
    );
    expect(container.firstElementChild).toHaveClass('flex');
  });
});
