// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { VikingAirSummary } from './viking-air-summary.tsx';

const priceLines = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="price-line-item"]');

describe('VikingAirSummary — title', () => {
  it.each(['empty', 'loading', 'no-air', 'summarized'] as const)(
    'labels the %s panel "Airfare Summary"',
    (variant) => {
      render(<VikingAirSummary variant={variant} />);
      expect(screen.getByRole('region', { name: 'Airfare Summary' })).toBeInTheDocument();
    },
  );
});

describe('VikingAirSummary — empty', () => {
  it('is the default and prompts for a gateway and airfare class', () => {
    const { container } = render(<VikingAirSummary />);
    expect(screen.getByText('Select Gateways and Airfare Class')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="icon-badge"] svg')).toBeTruthy();
    expect(priceLines(container)).toHaveLength(0);
  });
});

describe('VikingAirSummary — loading', () => {
  it('shows the spinner and marks the panel busy', () => {
    render(<VikingAirSummary variant="loading" />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.getByText('Calculating Airfare')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('VikingAirSummary — no Air', () => {
  it('says Viking Air is not included and shows no price rows', () => {
    const { container } = render(<VikingAirSummary variant="no-air" airfare="$9,595.00" />);
    expect(screen.getByText('Viking Air is not included')).toBeInTheDocument();
    expect(screen.queryByText('$9,595.00')).not.toBeInTheDocument();
    expect(priceLines(container)).toHaveLength(0);
  });
});

describe('VikingAirSummary — summarized', () => {
  const amounts = { airfare: '$9,595.00', discount: '$700.00', total: '$8,895.00' };

  it('renders airfare, discount and total as price line items', () => {
    const { container } = render(<VikingAirSummary variant="summarized" {...amounts} />);
    expect(priceLines(container)).toHaveLength(3);
    expect(screen.getByText('Origin - Return Airfare')).toBeInTheDocument();
    expect(screen.getByText('$9,595.00')).toBeInTheDocument();
    expect(screen.getByText(/Viking Air Discounts/)).toBeInTheDocument();
    expect(screen.getByText(/\$700\.00/)).toBeInTheDocument();
    expect(screen.getByText('Airfare Total')).toBeInTheDocument();
    expect(screen.getByText('$8,895.00')).toBeInTheDocument();
    expect(screen.getByText('Per Guest')).toBeInTheDocument();
  });

  it('shows the flight bullet and no spinner or empty-state copy', () => {
    const { container } = render(<VikingAirSummary variant="summarized" {...amounts} />);
    expect(container.querySelector('[data-slot="itinerary-bullet"] svg')).toBeTruthy();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Select Gateways and Airfare Class')).not.toBeInTheDocument();
  });

  it('still renders all three rows when amounts are not yet known', () => {
    const { container } = render(<VikingAirSummary variant="summarized" />);
    expect(priceLines(container)).toHaveLength(3);
  });
});

describe('VikingAirSummary — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = render(<VikingAirSummary className="extra" />);
    const root = container.querySelector('[data-slot="viking-air-summary"]');
    expect(root).toHaveClass('extra');
  });
});
