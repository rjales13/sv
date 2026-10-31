// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { StateroomsDeckplanConventions } from './staterooms-deckplan-conventions.tsx';

const ITEMS = [
  { label: 'Fitness Center', color: '#a2bacb' },
  { label: 'Guests Services', color: '#a2bacb' },
  { label: "Manfredi's Italian Restaurant®", color: '#83a4a5' },
];

describe('StateroomsDeckplanConventions — content', () => {
  it('renders all item labels', () => {
    render(<StateroomsDeckplanConventions items={ITEMS} />);
    expect(screen.getByText('Fitness Center')).toBeInTheDocument();
    expect(screen.getByText('Guests Services')).toBeInTheDocument();
    expect(screen.getByText("Manfredi's Italian Restaurant®")).toBeInTheDocument();
  });

  it('renders one color swatch per item', () => {
    const { container } = render(<StateroomsDeckplanConventions items={ITEMS} />);
    const swatches = container.querySelectorAll('[data-slot="deckplan-swatch"]');
    expect(swatches).toHaveLength(ITEMS.length);
  });

  it('applies the background color from each item to its swatch', () => {
    const { container } = render(<StateroomsDeckplanConventions items={ITEMS} />);
    const swatches = container.querySelectorAll('[data-slot="deckplan-swatch"]');
    // Check the style attribute carries the correct hex — environment-agnostic
    expect((swatches[0] as HTMLElement).getAttribute('style')).toContain('#a2bacb');
    expect((swatches[2] as HTMLElement).getAttribute('style')).toContain('#83a4a5');
  });

  it('renders nothing inside the container when items is empty', () => {
    const { container } = render(<StateroomsDeckplanConventions items={[]} />);
    const root = container.querySelector(
      '[data-slot="staterooms-deckplan-conventions"]',
    ) as HTMLElement;
    expect(root.children).toHaveLength(0);
  });

  it('hides swatches from the accessibility tree', () => {
    const { container } = render(<StateroomsDeckplanConventions items={ITEMS} />);
    const swatches = container.querySelectorAll('[data-slot="deckplan-swatch"]');
    for (const swatch of swatches) {
      expect(swatch).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('StateroomsDeckplanConventions — accessibility', () => {
  it('exposes list role on the container', () => {
    render(<StateroomsDeckplanConventions items={ITEMS} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('exposes one listitem per item', () => {
    render(<StateroomsDeckplanConventions items={ITEMS} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(ITEMS.length);
  });
});

describe('StateroomsDeckplanConventions — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<StateroomsDeckplanConventions items={[]} />);
    expect(container.querySelector('[data-slot="staterooms-deckplan-conventions"]')).toBeTruthy();
  });

  it('forwards data-testid and additional HTML attributes', () => {
    render(<StateroomsDeckplanConventions items={[]} data-testid="legend" />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('merges className without losing layout classes', () => {
    const { container } = render(<StateroomsDeckplanConventions items={[]} className="my-extra" />);
    const el = container.querySelector(
      '[data-slot="staterooms-deckplan-conventions"]',
    ) as HTMLElement;
    expect(el.className).toContain('my-extra');
    expect(el.className).toContain('flex-wrap');
  });
});
