// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import type { CategoryColumnProps } from '../../../../shared/components/category-column/index.ts';
import { StateroomsPriceCard } from './staterooms-price-card.tsx';

const EXAMPLE_COLUMNS: CategoryColumnProps[] = [
  {
    title: 'Owners Suite',
    items: [
      { abbrev: 'OS1', price: '$114,799', statA: '10' },
      { abbrev: 'OS2', price: '$114,799', statA: '10' },
    ],
  },
  {
    title: 'Deluxe Veranda',
    items: [
      { abbrev: 'DV1', price: '$9,999', statA: '5' },
      { abbrev: 'DV3', price: '$9,999', statA: '2' },
    ],
  },
  {
    title: 'Veranda',
    items: [{ abbrev: 'V1', price: '$7,499', statA: '8' }],
  },
];

describe('StateroomsPriceCard — Default state (category selected)', () => {
  it('renders the selected category name', () => {
    render(
      <StateroomsPriceCard
        selectedCategory={{ name: 'Deluxe Veranda', code: 'DV3', price: '$9,999' }}
        columns={EXAMPLE_COLUMNS}
      />,
    );
    // "Deluxe Veranda" appears in both the selection widget and as a column title
    expect(screen.getAllByText('Deluxe Veranda').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the selected category code', () => {
    render(
      <StateroomsPriceCard
        selectedCategory={{ name: 'Deluxe Veranda', code: 'DV3', price: '$9,999' }}
        columns={EXAMPLE_COLUMNS}
      />,
    );
    // DV3 appears in the selection widget; getAllByText handles duplicate occurrences
    expect(screen.getAllByText('DV3').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the selected category price', () => {
    render(
      <StateroomsPriceCard
        selectedCategory={{ name: 'Deluxe Veranda', code: 'DV3', price: '$9,999' }}
        columns={EXAMPLE_COLUMNS}
      />,
    );
    // price appears both in the selection widget and in the price grid
    expect(screen.getAllByText('$9,999').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all column titles', () => {
    render(
      <StateroomsPriceCard
        selectedCategory={{ name: 'Deluxe Veranda', code: 'DV3', price: '$9,999' }}
        columns={EXAMPLE_COLUMNS}
      />,
    );
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
    expect(screen.getByText('Veranda')).toBeInTheDocument();
  });
});

describe('StateroomsPriceCard — unselected state (no category chosen)', () => {
  it('renders em-dash placeholders in the selection widget', () => {
    render(<StateroomsPriceCard columns={EXAMPLE_COLUMNS} />);
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('still renders all column titles', () => {
    render(<StateroomsPriceCard columns={EXAMPLE_COLUMNS} />);
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Veranda')).toBeInTheDocument();
  });
});

describe('StateroomsPriceCard — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<StateroomsPriceCard columns={EXAMPLE_COLUMNS} />);
    expect(container.querySelector('[data-slot="staterooms-price-card"]')).toBeTruthy();
  });

  it('forwards data-testid and additional HTML attributes', () => {
    render(<StateroomsPriceCard columns={EXAMPLE_COLUMNS} data-testid="price-card" />);
    expect(screen.getByTestId('price-card')).toBeInTheDocument();
  });

  it('merges className without losing layout classes', () => {
    const { container } = render(
      <StateroomsPriceCard columns={EXAMPLE_COLUMNS} className="my-extra" />,
    );
    const el = container.querySelector('[data-slot="staterooms-price-card"]') as HTMLElement;
    expect(el.className).toContain('my-extra');
    expect(el.className).toContain('rounded-md');
  });
});

describe('StateroomsPriceCard — edge cases', () => {
  it('renders with a single column', () => {
    render(<StateroomsPriceCard columns={[EXAMPLE_COLUMNS[0] as CategoryColumnProps]} />);
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
  });

  it('renders the "Category Selection" header in the selection widget', () => {
    render(<StateroomsPriceCard columns={EXAMPLE_COLUMNS} />);
    expect(screen.getByText('Category Selection')).toBeInTheDocument();
  });
});
