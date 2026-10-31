// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import { StateroomsSelection } from './staterooms-selection.tsx';

describe('StateroomsSelection — Default state (category selected)', () => {
  it('renders the selected category name', () => {
    render(<StateroomsSelection categoryName="Deluxe Veranda" categoryCode="DV3" />);
    expect(screen.getByText('Deluxe Veranda')).toBeInTheDocument();
  });

  it('renders the selected category code', () => {
    render(<StateroomsSelection categoryName="Deluxe Veranda" categoryCode="DV3" />);
    expect(screen.getByText('DV3')).toBeInTheDocument();
  });

  it('renders both name and code together', () => {
    render(<StateroomsSelection categoryName="Owners Suite" categoryCode="OS1" />);
    expect(screen.getByText('Owners Suite')).toBeInTheDocument();
    expect(screen.getByText('OS1')).toBeInTheDocument();
  });
});

describe('StateroomsSelection — unselected state (no category chosen)', () => {
  it('renders em-dash placeholders for both name and code', () => {
    render(<StateroomsSelection />);
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows placeholders when only categoryName is missing', () => {
    render(<StateroomsSelection categoryCode="DV3" />);
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByText('DV3')).toBeInTheDocument();
  });

  it('shows placeholder when only categoryCode is missing', () => {
    render(<StateroomsSelection categoryName="Deluxe Veranda" />);
    expect(screen.getByText('Deluxe Veranda')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });
});

describe('StateroomsSelection — always-visible header', () => {
  it('renders the "Stateroom Selection" title in the default state', () => {
    render(<StateroomsSelection categoryName="Deluxe Veranda" categoryCode="DV3" />);
    expect(screen.getByText('Stateroom Selection')).toBeInTheDocument();
  });

  it('renders the "Stateroom Selection" title in the unselected state', () => {
    render(<StateroomsSelection />);
    expect(screen.getByText('Stateroom Selection')).toBeInTheDocument();
  });
});

describe('StateroomsSelection — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<StateroomsSelection />);
    expect(container.querySelector('[data-slot="staterooms-selection"]')).toBeTruthy();
  });

  it('forwards data-testid and additional HTML attributes', () => {
    render(<StateroomsSelection data-testid="selection-widget" />);
    expect(screen.getByTestId('selection-widget')).toBeInTheDocument();
  });

  it('merges className without losing layout classes', () => {
    const { container } = render(<StateroomsSelection className="my-extra" />);
    const el = container.querySelector('[data-slot="staterooms-selection"]') as HTMLElement;
    expect(el.className).toContain('my-extra');
    expect(el.className).toContain('flex-col');
  });
});
