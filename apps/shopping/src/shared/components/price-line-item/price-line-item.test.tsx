// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { PriceLineItem } from './price-line-item.tsx';

const LABEL = 'Originating Gateway Air Add On';
const AMOUNT = '$1,000.00';
const FARE = '$10,000.00';
const COMM_PERCENT = '20%';
const COMMISSION = '$100,000.00';

describe('PriceLineItem — list', () => {
  it('renders label and amount', () => {
    render(<PriceLineItem label={LABEL} amount={AMOUNT} />);
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(AMOUNT)).toBeInTheDocument();
  });

  it('does not render Per Guest helper', () => {
    render(<PriceLineItem label={LABEL} amount={AMOUNT} />);
    expect(screen.queryByText('Per Guest')).not.toBeInTheDocument();
  });
});

describe('PriceLineItem — list-na', () => {
  it('renders label and "Not eligible"', () => {
    render(<PriceLineItem variant="list-na" label={LABEL} />);
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText('Not eligible')).toBeInTheDocument();
  });
});

describe('PriceLineItem — discount', () => {
  it('renders the discount label with "–" prefix and red amount', () => {
    render(<PriceLineItem variant="discount" label={LABEL} amount={AMOUNT} />);
    expect(screen.getByText(/–.*Originating/)).toBeInTheDocument();
    expect(screen.getByText(`– ${AMOUNT}`)).toBeInTheDocument();
  });
});

describe('PriceLineItem — subtotal', () => {
  it('renders bold label and amount', () => {
    render(<PriceLineItem variant="subtotal" label={LABEL} amount={AMOUNT} />);
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(AMOUNT)).toBeInTheDocument();
  });

  it('does not show Per Guest helper', () => {
    render(<PriceLineItem variant="subtotal" label={LABEL} amount={AMOUNT} />);
    expect(screen.queryByText('Per Guest')).not.toBeInTheDocument();
  });
});

describe('PriceLineItem — total', () => {
  it('renders label, amount, and Per Guest', () => {
    render(<PriceLineItem variant="total" label={LABEL} amount={AMOUNT} />);
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(AMOUNT)).toBeInTheDocument();
    expect(screen.getByText('Per Guest')).toBeInTheDocument();
  });
});

describe('PriceLineItem — grand-total', () => {
  it('renders "Grand Total", the large amount, and Per Guest', () => {
    render(<PriceLineItem variant="grand-total" amount={AMOUNT} />);
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText(AMOUNT)).toBeInTheDocument();
    expect(screen.getByText('Per Guest')).toBeInTheDocument();
  });
});

describe('PriceLineItem — showPerGuest', () => {
  // Figma's Price-Item "Helper" boolean: build-panel guest totals hide the helper line.
  it.each(['total', 'grand-total'] as const)('hides Per Guest on %s when false', (variant) => {
    render(<PriceLineItem variant={variant} label={LABEL} amount={AMOUNT} showPerGuest={false} />);
    expect(screen.getByText(AMOUNT)).toBeInTheDocument();
    expect(screen.queryByText('Per Guest')).not.toBeInTheDocument();
  });
});

describe('PriceLineItem — comm-header', () => {
  it('renders column headers FARE, COMM %, COMMISSION', () => {
    render(<PriceLineItem variant="comm-header" label={LABEL} />);
    expect(screen.getByText('FARE')).toBeInTheDocument();
    expect(screen.getByText('COMM %')).toBeInTheDocument();
    expect(screen.getByText('COMMISSION')).toBeInTheDocument();
  });
});

describe('PriceLineItem — comm-list', () => {
  it('renders label, fare, commPercent, and commission', () => {
    render(
      <PriceLineItem
        variant="comm-list"
        label={LABEL}
        fare={FARE}
        commPercent={COMM_PERCENT}
        commission={COMMISSION}
      />,
    );
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(FARE)).toBeInTheDocument();
    expect(screen.getByText(COMM_PERCENT)).toBeInTheDocument();
    expect(screen.getByText(COMMISSION)).toBeInTheDocument();
  });
});

describe('PriceLineItem — comm-list-na', () => {
  it('renders disabled label, "Not eligible", and dashes', () => {
    render(<PriceLineItem variant="comm-list-na" label={LABEL} />);
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText('Not eligible')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});

describe('PriceLineItem — comm-discount', () => {
  it('renders dash-label, red fare, and dashes for % and commission', () => {
    render(<PriceLineItem variant="comm-discount" label={LABEL} fare={FARE} />);
    expect(screen.getByText(/–.*Originating/)).toBeInTheDocument();
    expect(screen.getByText(`– ${FARE}`)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});

describe('PriceLineItem — comm-subtotal', () => {
  it('renders bold label, fare, commPercent, and commission', () => {
    render(
      <PriceLineItem
        variant="comm-subtotal"
        label={LABEL}
        fare={FARE}
        commPercent={COMM_PERCENT}
        commission={COMMISSION}
      />,
    );
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(FARE)).toBeInTheDocument();
    expect(screen.getByText(COMM_PERCENT)).toBeInTheDocument();
    expect(screen.getByText(COMMISSION)).toBeInTheDocument();
  });
});

describe('PriceLineItem — comm-total', () => {
  it('renders bold label, large fare, commPercent, and large commission', () => {
    render(
      <PriceLineItem
        variant="comm-total"
        label={LABEL}
        fare={FARE}
        commPercent={COMM_PERCENT}
        commission={COMMISSION}
      />,
    );
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(FARE)).toBeInTheDocument();
    expect(screen.getByText(COMM_PERCENT)).toBeInTheDocument();
    expect(screen.getByText(COMMISSION)).toBeInTheDocument();
  });
});

describe('PriceLineItem — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<PriceLineItem label={LABEL} amount={AMOUNT} />);
    expect(container.querySelector('[data-slot="price-line-item"]')).toBeTruthy();
  });

  it('forwards className to the root element', () => {
    const { container } = render(<PriceLineItem label={LABEL} amount={AMOUNT} className="extra" />);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('forwards data-testid', () => {
    render(<PriceLineItem label={LABEL} amount={AMOUNT} data-testid="line" />);
    expect(screen.getByTestId('line')).toBeInTheDocument();
  });
});
