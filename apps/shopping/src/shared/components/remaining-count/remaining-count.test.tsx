// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { RemainingCount } from './remaining-count';

describe('RemainingCount — content', () => {
  it('renders the count text', () => {
    render(<RemainingCount count="9+ remaining" />);
    expect(screen.getByText('9+ remaining')).toBeInTheDocument();
  });

  it('applies the slot attribute for selector targeting', () => {
    const { container } = render(<RemainingCount count="9+ remaining" />);
    expect(container.querySelector('[data-slot="remaining-count"]')).toBeTruthy();
  });
});

describe('RemainingCount — color (Figma more9 / less9)', () => {
  it('uses primary text by default (more9 variant)', () => {
    const { container } = render(<RemainingCount count="9+ remaining" />);
    const el = container.querySelector('[data-slot="remaining-count"]') as HTMLElement;
    expect(el.className).toContain('text-primary');
    expect(el.className).not.toContain('text-destructive');
  });

  it('uses destructive text when lowInventory (less9 variant)', () => {
    const { container } = render(<RemainingCount count="7 remaining" lowInventory />);
    const el = container.querySelector('[data-slot="remaining-count"]') as HTMLElement;
    expect(el.className).toContain('text-destructive');
    expect(el.className).not.toContain('text-primary');
  });
});

describe('RemainingCount — accessibility', () => {
  it('adds sr-only Low availability supplement when lowInventory', () => {
    render(<RemainingCount count="7 remaining" lowInventory />);
    const supplement = screen.getByText('Low availability');
    expect(supplement).toHaveClass('sr-only');
  });

  it('omits the sr-only supplement when not lowInventory', () => {
    render(<RemainingCount count="9+ remaining" />);
    expect(screen.queryByText('Low availability')).toBeNull();
  });
});

describe('RemainingCount — className passthrough', () => {
  it('merges a custom className without losing the base styles', () => {
    const { container } = render(<RemainingCount count="9+ remaining" className="my-custom" />);
    const el = container.querySelector('[data-slot="remaining-count"]') as HTMLElement;
    expect(el.className).toContain('my-custom');
    expect(el.className).toContain('text-primary');
  });
});
