// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { CardHeader, type CardHeaderCategory } from './card-header.tsx';

// CardHeader is presentational and stateless. What matters on a live call is
// that a sales agent reads the right row: the right product line, the right
// ship and voyage code, and — above all — never a price on a sold-out sailing.

const CRUISE = {
  title: 'Grand European Tour',
  meta: 'EUR',
  ship: 'Viking Shipxxx',
  voyageCode: 'VIL00000000',
  priceLabel: 'Starting at',
} as const;

const EXTENSION = {
  title: 'Extension Name',
  meta: '4 Nights',
  priceLabel: '54 Available',
} as const;

describe('CardHeader — category chip', () => {
  it.each([
    ['oceans', 'Oceans'],
    ['rivers', 'Rivers'],
    ['expeditions', 'Expeditions'],
    ['mississippi', 'Mississippi'],
    ['pre', 'PRE'],
    ['pre-stopover', 'PRE STOPOVER'],
    ['post', 'POST'],
    ['post-stopover', 'POST STOPOVER'],
    ['land-package', 'INCLUDED LAND PACKAGE'],
  ] as [CardHeaderCategory, string][])('renders %s as "%s"', (category, label) => {
    render(<CardHeader {...CRUISE} category={category} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // PRE and PRE STOPOVER are different products sharing a colour; only the
  // label separates them, so a substring match must not conflate the two.
  it('distinguishes the stopover categories from their base category', () => {
    render(<CardHeader {...EXTENSION} category="pre-stopover" />);
    expect(screen.getByText('PRE STOPOVER')).toBeInTheDocument();
    expect(screen.queryByText('PRE')).not.toBeInTheDocument();
  });
});

describe('CardHeader — cruise rows', () => {
  it('renders the title and the full meta strip', () => {
    render(<CardHeader {...CRUISE} category="oceans" />);
    expect(screen.getByText('Grand European Tour')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('Viking Shipxxx')).toBeInTheDocument();
    expect(screen.getByText('VIL00000000')).toBeInTheDocument();
  });

  it('renders the price behind its prefix', () => {
    render(<CardHeader {...CRUISE} category="oceans" amount="$7,250.00" />);
    expect(screen.getByText('Starting at')).toBeInTheDocument();
    expect(screen.getByText('$7,250.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });
});

describe('CardHeader — extension rows', () => {
  it('omits the ship and voyage code when they are not supplied', () => {
    render(<CardHeader {...EXTENSION} category="pre" />);
    expect(screen.getByText('4 Nights')).toBeInTheDocument();
    expect(screen.queryByText('Viking Shipxxx')).not.toBeInTheDocument();
    expect(screen.queryByText('VIL00000000')).not.toBeInTheDocument();
  });

  it('uses the availability count as the price prefix', () => {
    render(<CardHeader {...EXTENSION} category="post" />);
    expect(screen.getByText('54 Available')).toBeInTheDocument();
    expect(screen.queryByText('Starting at')).not.toBeInTheDocument();
  });

  it('shows the figure alone when no prefix is supplied', () => {
    render(<CardHeader title="Extension Name" meta="4 Nights" category="land-package" />);
    expect(screen.getByText('$4,999.00')).toBeInTheDocument();
    expect(screen.queryByText('54 Available')).not.toBeInTheDocument();
    expect(screen.queryByText('Starting at')).not.toBeInTheDocument();
  });

  it('renders a lone divider when only one of ship/voyageCode is given', () => {
    render(<CardHeader {...EXTENSION} category="pre" ship="Viking Sky" />);
    expect(screen.getByText('Viking Sky')).toBeInTheDocument();
    expect(screen.queryByText('VIL00000000')).not.toBeInTheDocument();
  });
});

describe('CardHeader — sold out', () => {
  // Quoting a price on a sold-out sailing is the failure that reaches a customer.
  it('replaces the whole price block with the sold-out badge', () => {
    render(<CardHeader {...CRUISE} category="oceans" soldOut amount="$4,999.00" />);
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
    expect(screen.queryByText('$4,999.00')).not.toBeInTheDocument();
    expect(screen.queryByText('Starting at')).not.toBeInTheDocument();
    expect(screen.queryByText('USD')).not.toBeInTheDocument();
  });

  it('keeps the voyage identifiers visible so the row stays identifiable', () => {
    render(<CardHeader {...CRUISE} category="oceans" soldOut />);
    expect(screen.getByText('Grand European Tour')).toBeInTheDocument();
    expect(screen.getByText('VIL00000000')).toBeInTheDocument();
  });

  it('suppresses the price on extension rows too', () => {
    render(<CardHeader {...EXTENSION} category="post" soldOut />);
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
    expect(screen.queryByText('54 Available')).not.toBeInTheDocument();
  });
});

describe('CardHeader — presentation', () => {
  it('hides the meta dividers from assistive tech', () => {
    const { container } = render(<CardHeader {...CRUISE} category="oceans" />);
    // Two hairlines: before the ship and before the voyage code.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('applies a caller className to the row', () => {
    const { container } = render(
      <CardHeader {...CRUISE} category="oceans" className="rounded-t-md" />,
    );
    expect(container.firstElementChild).toHaveClass('rounded-t-md');
  });

  it('renders the caller currency code verbatim', () => {
    render(<CardHeader {...CRUISE} category="oceans" currencyCode="GBP" />);
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.queryByText('USD')).not.toBeInTheDocument();
  });
});
