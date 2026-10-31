// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { BuildPanelExpanded, type BuildPanelExpandedProps } from './expanded.tsx';

const cr = {
  kind: 'cr' as const,
  lines: [
    { variant: 'list' as const, label: 'cr Tour Fare', amount: '$11,349.00' },
    { variant: 'discount' as const, label: 'Past Guest Level 2 Discount', amount: '$100.00' },
    { variant: 'subtotal' as const, label: 'cr Subtotal', amount: '$10,949.00' },
  ],
};

const baseProps: BuildPanelExpandedProps = {
  title: 'Paris to the Swiss Alps',
  startDate: '01 JUL 2027 (MON)',
  endDate: '12 JUL 2027 (MON)',
  details: ['VA Herja', 'HRJ270426T', '7 cr Nights / 11 Total Nights'],
  promoCode: 'AGRDN26-3',
  guests: [
    {
      label: 'Guest 1',
      name: 'Mr. John Smith Whitcombe',
      tpp: { eligible: true, included: true, amount: '$749.00' },
      sections: [
        cr,
        { kind: 'hotel', lines: [{ variant: 'list', label: 'Hotel', amount: '$2,229.00' }] },
      ],
      totalLabel: 'Guest 1 Total',
      total: '$23,984.00',
    },
    {
      label: 'Guest 2',
      name: 'Ms. Mary Stone Davis',
      tpp: { eligible: false, reason: 'Non US Resident' },
      sections: [cr],
      totalLabel: 'Guest 2 Total',
      total: '$25,696.00',
    },
  ],
  grossTotal: '$49,680.00',
  currencyCode: 'USD',
};

const renderPanel = (props: Partial<BuildPanelExpandedProps> = {}) =>
  render(<BuildPanelExpanded {...baseProps} {...props} />);

describe('BuildPanelExpanded — header', () => {
  it('shows the cr title, dates, details and promo code', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Paris to the Swiss Alps' })).toBeInTheDocument();
    expect(screen.getByText('01 JUL 2027 (MON)')).toBeInTheDocument();
    expect(screen.getByText('12 JUL 2027 (MON)')).toBeInTheDocument();
    expect(screen.getByText('HRJ270426T')).toBeInTheDocument();
    expect(screen.getByText('PROMO CODE: AGRDN26-3')).toBeInTheDocument();
  });

  it('divides the header details and promo badge with Divider rules', () => {
    const { container } = renderPanel();
    const header = container.querySelector('header');
    // 3 details → 2 rules between them, plus 1 before the promo badge.
    expect(header?.querySelectorAll('[data-slot="separator"]')).toHaveLength(3);
  });

  it('omits the promo badge when there is no promo code', () => {
    const { promoCode: _omit, ...rest } = baseProps;
    render(<BuildPanelExpanded {...rest} />);
    expect(screen.queryByText(/PROMO CODE/)).not.toBeInTheDocument();
  });

  it('fires onCollapse from the Collapse button', () => {
    const onCollapse = vi.fn();
    renderPanel({ onCollapse });
    fireEvent.click(screen.getByRole('button', { name: /collapse/i }));
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });
});

describe('BuildPanelExpanded — guest columns', () => {
  it('renders one labelled column per guest with its rows and total', () => {
    renderPanel();
    const guest1 = screen.getByRole('group', { name: 'Guest 1' });
    expect(within(guest1).getByText('Mr. John Smith Whitcombe')).toBeInTheDocument();
    expect(within(guest1).getByText('cr Tour Fare')).toBeInTheDocument();
    expect(within(guest1).getByText('– $100.00')).toBeInTheDocument();
    expect(within(guest1).getByText('Guest 1 Total')).toBeInTheDocument();
    expect(within(guest1).getByText('$23,984.00')).toBeInTheDocument();
    expect(within(guest1).queryByText('Per Guest')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Guest 2' })).toBeInTheDocument();
  });

  it('lets the agent toggle Travel Protection for an eligible guest', () => {
    const onIncludedChange = vi.fn();
    const [guest1, guest2] = baseProps.guests;
    if (!guest1 || !guest2) throw new Error('baseProps.guests must have at least 2 entries');
    renderPanel({
      guests: [
        {
          ...guest1,
          tpp: { eligible: true, included: true, amount: '$749.00', onIncludedChange },
        },
        guest2,
      ],
    });
    const checkbox = screen.getByRole('checkbox', {
      name: /Include Travel Protection Plan - TPP for this guest/,
    });
    expect(checkbox).toBeChecked();
    expect(screen.getByText('($749.00)')).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onIncludedChange).toHaveBeenCalledWith(false);
  });

  it('explains why an ineligible guest cannot take Travel Protection', () => {
    renderPanel();
    const guest2 = screen.getByRole('group', { name: 'Guest 2' });
    expect(within(guest2).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      within(guest2).getByText('TPP Non eligible guest (Non US Resident)'),
    ).toBeInTheDocument();
  });

  it('draws one bullet per price section, plus a hidden one aligning the total', () => {
    renderPanel();
    const guest1 = screen.getByRole('group', { name: 'Guest 1' });
    const bullets = guest1.querySelectorAll('[data-slot="section-bullet"]');
    expect(bullets).toHaveLength(2 + 1);
    expect(bullets[2]?.parentElement).toHaveClass('opacity-0');
  });
});

describe('BuildPanelExpanded — footer', () => {
  it('shows the gross total and wires the footer actions', () => {
    const onSaveOpportunity = vi.fn();
    const onSaveSearch = vi.fn();
    const onBookNow = vi.fn();
    renderPanel({ onSaveOpportunity, onSaveSearch, onBookNow });
    expect(screen.getByText('$49,680.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save opportunity/i }));
    fireEvent.click(screen.getByRole('button', { name: /save search/i }));
    fireEvent.click(screen.getByRole('button', { name: /book now/i }));
    expect(onSaveOpportunity).toHaveBeenCalledTimes(1);
    expect(onSaveSearch).toHaveBeenCalledTimes(1);
    expect(onBookNow).toHaveBeenCalledTimes(1);
  });
});

describe('BuildPanelExpanded — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = renderPanel({ className: 'extra' });
    expect(container.querySelector('[data-slot="build-panel-expanded"]')).toHaveClass('extra');
  });
});
