// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { StateroomsCategorySelection } from './staterooms-category-selection';

describe('StateroomsCategorySelection — default state (data provided)', () => {
  it('renders the section title', () => {
    render(
      <StateroomsCategorySelection
        categoryName="Deluxe Veranda"
        categoryCode="DV3"
        price="$9,999"
      />,
    );
    expect(screen.getByText('Category Selection')).toBeInTheDocument();
  });

  it('renders the category name', () => {
    render(
      <StateroomsCategorySelection
        categoryName="Deluxe Veranda"
        categoryCode="DV3"
        price="$9,999"
      />,
    );
    expect(screen.getByText('Deluxe Veranda')).toBeInTheDocument();
  });

  it('renders the category code', () => {
    render(
      <StateroomsCategorySelection
        categoryName="Deluxe Veranda"
        categoryCode="DV3"
        price="$9,999"
      />,
    );
    expect(screen.getByText('DV3')).toBeInTheDocument();
  });

  it('renders the price', () => {
    render(
      <StateroomsCategorySelection
        categoryName="Deluxe Veranda"
        categoryCode="DV3"
        price="$9,999"
      />,
    );
    expect(screen.getByText('$9,999')).toBeInTheDocument();
  });

  it('does not render em-dashes in default state', () => {
    render(
      <StateroomsCategorySelection
        categoryName="Deluxe Veranda"
        categoryCode="DV3"
        price="$9,999"
      />,
    );
    // The em-dash "–" should not appear when real data is supplied
    expect(screen.queryAllByText('–')).toHaveLength(0);
  });
});

describe('StateroomsCategorySelection — empty state (no data)', () => {
  it('renders the section title in empty state', () => {
    render(<StateroomsCategorySelection />);
    expect(screen.getByText('Category Selection')).toBeInTheDocument();
  });

  it('renders em-dashes for category name and code', () => {
    render(<StateroomsCategorySelection />);
    // Two "–" in the category row (name + code), one for price
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('does not render real category data in empty state', () => {
    render(<StateroomsCategorySelection />);
    expect(screen.queryByText('Deluxe Veranda')).toBeNull();
    expect(screen.queryByText('DV3')).toBeNull();
    expect(screen.queryByText('$9,999')).toBeNull();
  });
});

describe('StateroomsCategorySelection — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(
      <StateroomsCategorySelection categoryName="X" categoryCode="X1" price="$0" />,
    );
    expect(container.querySelector('[data-slot="staterooms-category-selection"]')).toBeTruthy();
  });

  it('forwards data-testid and additional HTML attributes', () => {
    render(
      <StateroomsCategorySelection
        categoryName="X"
        categoryCode="X1"
        price="$0"
        data-testid="cat-sel"
      />,
    );
    expect(screen.getByTestId('cat-sel')).toBeInTheDocument();
  });

  it('merges className without losing layout classes', () => {
    const { container } = render(
      <StateroomsCategorySelection
        categoryName="X"
        categoryCode="X1"
        price="$0"
        className="my-extra"
      />,
    );
    const el = container.querySelector(
      '[data-slot="staterooms-category-selection"]',
    ) as HTMLElement;
    expect(el.className).toContain('my-extra');
    expect(el.className).toContain('rounded-sm');
  });
});
