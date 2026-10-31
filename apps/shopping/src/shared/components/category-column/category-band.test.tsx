// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { CategoryBand } from './category-band.tsx';
import type { CategoryColumnProps } from './category-column.tsx';

// A band is one row of category columns. The rules between columns are purely
// structural: there must be one fewer than the columns, never a trailing one.

const COLUMNS: CategoryColumnProps[] = [
  { title: 'Owners Suite', items: [{ abbrev: 'DN2', price: '$114,799' }] },
  { title: 'Explorer Suite', items: [{ abbrev: 'EX1', price: '$98,500' }] },
  { title: 'Deluxe Veranda', items: [{ abbrev: 'DV1', price: '$44,200' }] },
];

describe('CategoryBand — content', () => {
  it('renders a column per entry', () => {
    const { container } = render(<CategoryBand columns={COLUMNS} />);
    expect(container.querySelectorAll('[data-slot="category-column"]')).toHaveLength(3);
  });

  it('renders every category name', () => {
    render(<CategoryBand columns={COLUMNS} />);
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
    expect(screen.getByText('Explorer Suite')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Veranda')).toBeInTheDocument();
  });

  it('keeps the columns in the order given', () => {
    const { container } = render(<CategoryBand columns={COLUMNS} />);
    const titles = [...container.querySelectorAll('[data-slot="category-column-title"]')].map(
      (el) => el.textContent,
    );
    expect(titles).toEqual(['Owners Suite', 'Explorer Suite', 'Deluxe Veranda']);
  });

  it('renders the rows belonging to each column', () => {
    render(<CategoryBand columns={COLUMNS} />);
    expect(screen.getByText('DN2')).toBeInTheDocument();
    expect(screen.getByText('EX1')).toBeInTheDocument();
    expect(screen.getByText('DV1')).toBeInTheDocument();
  });
});

describe('CategoryBand — dividers', () => {
  it('draws a rule between each pair of columns', () => {
    const { container } = render(<CategoryBand columns={COLUMNS} />);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(2);
  });

  // A lone category must not render a dangling rule beside it.
  it('draws no rule for a single column', () => {
    const { container } = render(<CategoryBand columns={[COLUMNS[0] as CategoryColumnProps]} />);
    expect(container.querySelectorAll('[data-slot="category-column"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(0);
  });

  it('renders nothing but the container when there are no columns', () => {
    const { container } = render(<CategoryBand columns={[]} />);
    expect(container.querySelectorAll('[data-slot="category-column"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(0);
  });
});

describe('CategoryBand — presentation', () => {
  it('applies a caller className to the band', () => {
    const { container } = render(<CategoryBand columns={COLUMNS} className="w-96" />);
    expect(container.firstElementChild).toHaveClass('w-96');
  });

  it('keeps the caller className alongside the layout classes', () => {
    const { container } = render(<CategoryBand columns={COLUMNS} className="w-96" />);
    expect(container.firstElementChild).toHaveClass('flex');
  });
});
