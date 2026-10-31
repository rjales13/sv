// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { VikingAirGuestCard, type VikingAirGuestCardProps } from './viking-air-guest-card.tsx';

const baseProps: VikingAirGuestCardProps = {
  title: 'Guest 1 / Main PAX',
  guest: { name: 'Mr. John Smith Whitcombe', customerNumber: '100838606001' },
  includeAirfare: true,
  gatewayOptions: [{ value: 'SEA', label: 'Seattle (SEA)' }],
  classOptions: [{ value: 'economy', label: 'Economy' }],
};

const renderCard = (props: Partial<VikingAirGuestCardProps> = {}) =>
  render(<VikingAirGuestCard {...baseProps} {...props} />);

describe('VikingAirGuestCard — header', () => {
  it('labels the card with its title', () => {
    renderCard();
    expect(screen.getByRole('region', { name: 'Guest 1 / Main PAX' })).toBeInTheDocument();
  });

  it('collapses to the header when the chevron is pressed', () => {
    const onExpandedChange = vi.fn();
    renderCard({ onExpandedChange });
    const toggle = screen.getByRole('button', { name: 'Collapse Guest 1 / Main PAX' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);

    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Expand Guest 1 / Main PAX' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('Mr. John Smith Whitcombe')).not.toBeInTheDocument();
  });

  it('respects a controlled collapsed state', () => {
    renderCard({ expanded: false });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Airfare Summary' })).not.toBeInTheDocument();
  });
});

describe('VikingAirGuestCard — airfare included', () => {
  it('shows the guest, the Include Airfare toggle, four selects and the summary', () => {
    renderCard();
    expect(screen.getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Include Airfare' })).toBeChecked();
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
    expect(screen.getByRole('combobox', { name: 'Origin Gateway' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Return Gateway' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: 'Class' })).toHaveLength(2);
    expect(screen.getByText('Select Gateways and Airfare Class')).toBeInTheDocument();
  });

  it('reports Include Airfare changes', () => {
    const onIncludeAirfareChange = vi.fn();
    renderCard({ onIncludeAirfareChange });
    fireEvent.click(screen.getByRole('switch', { name: 'Include Airfare' }));
    expect(onIncludeAirfareChange).toHaveBeenCalledWith(false);
  });

  it('forwards the summary state', () => {
    renderCard({ summary: { variant: 'loading' } });
    expect(screen.getByText('Calculating Airfare')).toBeInTheDocument();
  });
});

describe('VikingAirGuestCard — copy to next guest', () => {
  it('renders the checkbox only when provided, and reports changes', () => {
    const onCheckedChange = vi.fn();
    const label = 'Use the same information for Guest 2';
    const { rerender } = renderCard();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    rerender(
      <VikingAirGuestCard
        {...baseProps}
        copyToNextGuest={{ label, checked: true, onCheckedChange }}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: label });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});

describe('VikingAirGuestCard — no Viking Air', () => {
  it('hides the selects and checkbox and shows the not-included summary', () => {
    renderCard({
      includeAirfare: false,
      copyToNextGuest: { label: 'Use the same information for Guest 2', checked: false },
      summary: { variant: 'summarized', total: '$8,895.00' },
    });
    expect(screen.getByRole('switch', { name: 'Include Airfare' })).not.toBeChecked();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Viking Air is not included')).toBeInTheDocument();
    expect(screen.queryByText('$8,895.00')).not.toBeInTheDocument();
  });
});

describe('VikingAirGuestCard — disabled', () => {
  it('disables the toggle, every select and the checkbox', () => {
    renderCard({
      disabled: true,
      copyToNextGuest: { label: 'Use the same information for Guest 2', checked: true },
    });
    expect(screen.getByRole('switch', { name: 'Include Airfare' })).toBeDisabled();
    for (const select of screen.getAllByRole('combobox')) expect(select).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Collapse/ })).toBeEnabled();
  });
});

describe('VikingAirGuestCard — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = renderCard({ className: 'extra' });
    expect(container.querySelector('[data-slot="viking-air-guest-card"]')).toHaveClass('extra');
  });
});

describe('VikingAirGuestCard — flight defaults', () => {
  it('fills the return gateway and Economy on both legs from the origin pick', () => {
    const onSelectionChange = vi.fn();
    renderCard({
      gatewayOptions: [
        { value: 'C/O', label: 'Cruise Only' },
        { value: 'SEA', label: 'Seattle (SEA)' },
      ],
      classOptions: [
        { value: 'D', label: 'Business - D' },
        { value: 'Q', label: 'Economy - Q' },
      ],
      onSelectionChange,
    });

    fireEvent.focus(screen.getByRole('combobox', { name: 'Origin Gateway' }));
    fireEvent.pointerDown(screen.getByRole('option', { name: 'Seattle (SEA)' }));

    expect(onSelectionChange).toHaveBeenCalledWith({
      originGateway: 'SEA',
      originClass: 'Q',
      returnGateway: 'SEA',
      returnClass: 'Q',
    });
  });

  it('leaves an overridden return leg alone when the origin changes', () => {
    const onSelectionChange = vi.fn();
    renderCard({
      gatewayOptions: [
        { value: 'SEA', label: 'Seattle (SEA)' },
        { value: 'BOS', label: 'Boston (BOS)' },
      ],
      selection: {
        originGateway: 'SEA',
        originClass: 'economy',
        returnGateway: 'LAX',
        returnClass: 'economy',
      },
      onSelectionChange,
    });

    fireEvent.focus(screen.getByRole('combobox', { name: 'Origin Gateway' }));
    fireEvent.pointerDown(screen.getByRole('option', { name: 'Boston (BOS)' }));

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ originGateway: 'BOS', returnGateway: 'LAX' }),
    );
  });
});

// The card used to be pinned to Figma's 1280px frame, leaving a dead band beside it on wider
// screens. jsdom has no layout, so the fluid sizing is pinned by class.
describe('VikingAirGuestCard — fluid width', () => {
  it('fills its container instead of a fixed frame width', () => {
    const { container } = renderCard();
    const card = container.querySelector('[data-slot="viking-air-guest-card"]');
    expect(card).toHaveClass('w-full');
    expect(card?.className).not.toMatch(/w-\[\d+px\]/);
  });

  it('lets the form and both gateway columns grow, keeping the summary its designed width', () => {
    const { container } = renderCard();
    const body = container.querySelector('[data-slot="viking-air-guest-card-body"]');
    expect(body).toHaveClass('w-full');
    expect(container.querySelector('[data-slot="viking-air-guest-card-form"]')).toHaveClass(
      'flex-1',
    );
    for (const column of container.querySelectorAll('[data-slot="viking-air-guest-card-leg"]')) {
      expect(column).toHaveClass('flex-1');
    }
  });
});
