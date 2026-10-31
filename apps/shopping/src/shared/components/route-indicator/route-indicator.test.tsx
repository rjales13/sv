// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { RouteIndicator } from './route-indicator';

describe('RouteIndicator — default variant (point-to-point)', () => {
  it('renders the from and to cities', () => {
    render(<RouteIndicator from="Paris" to="Zürich" />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Zürich')).toBeInTheDocument();
  });

  it('includes sr-only "to" text so direction is not glyph-only', () => {
    render(<RouteIndicator from="Paris" to="Zürich" />);
    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('omits the to city when to is not provided', () => {
    render(<RouteIndicator from="Paris" />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.queryByText('Zürich')).toBeNull();
  });
});

describe('RouteIndicator — roundtrip variant', () => {
  it('renders the from city and the Roundtrip label', () => {
    render(<RouteIndicator from="Paris" roundtrip />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Roundtrip')).toBeInTheDocument();
  });

  it('does not render the to city on roundtrip', () => {
    render(<RouteIndicator from="Paris" to="Zürich" roundtrip />);
    // "to" as sr-only text is absent — Roundtrip carries the meaning instead
    expect(screen.queryByText('to')).toBeNull();
    expect(screen.queryByText('Zürich')).toBeNull();
  });
});

describe('RouteIndicator — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<RouteIndicator from="Paris" to="Zürich" />);
    expect(container.querySelector('[data-slot="route-indicator"]')).toBeTruthy();
  });

  it('forwards data-testid and other HTML attributes', () => {
    render(<RouteIndicator from="Paris" to="Zürich" data-testid="my-route" />);
    expect(screen.getByTestId('my-route')).toBeInTheDocument();
  });

  it('merges className without losing layout classes', () => {
    const { container } = render(<RouteIndicator from="Paris" to="Zürich" className="my-custom" />);
    const el = container.querySelector('[data-slot="route-indicator"]') as HTMLElement;
    expect(el.className).toContain('my-custom');
    expect(el.className).toContain('flex');
  });
});
