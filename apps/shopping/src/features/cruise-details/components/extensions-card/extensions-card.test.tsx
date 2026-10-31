// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { type ExtensionCardHotelStop, ExtensionsCard } from './extensions-card.tsx';

const STOP: ExtensionCardHotelStop = {
  departure: { date: '12 JUL 2027 (SAT)', cityCode: 'VRN', cityName: 'Verona' },
  arrival: { date: '13 JUL 2027 (SUN)', cityCode: 'VRN', cityName: 'Verona' },
  hotel: { name: 'Verona Hotel', type: 'Pre Hotel', nights: 2 },
};

const STOP_2: ExtensionCardHotelStop = {
  departure: { date: '13 JUL 2027 (SUN)', cityCode: 'OMO', cityName: 'Como' },
  arrival: { date: '14 JUL 2027 (MON)', cityCode: 'OMO', cityName: 'Como' },
  hotel: { name: 'Como Hotel', type: 'Post Hotel', nights: 3 },
};

const BULLETS = ['3 hotel nights in Milan (as shown or similar)', 'Services of a Viking Host'];

const BASE_PROPS = {
  category: 'pre' as const,
  title: 'Extension Name',
  meta: '4 NIGHTS',
  amount: '$4,999.00',
  currencyCode: 'USD',
  stops: [STOP],
  descriptionBullets: BULLETS,
};

describe('ExtensionsCard — header', () => {
  it('renders the extension title', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByText('Extension Name')).toBeInTheDocument();
  });

  it('renders the meta duration', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByText('4 NIGHTS')).toBeInTheDocument();
  });

  it('renders the SOLD OUT badge when soldOut=true', () => {
    render(<ExtensionsCard {...BASE_PROPS} soldOut />);
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });
});

describe('ExtensionsCard — hotel stops', () => {
  it('renders departure date for each stop', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByText('12 JUL 2027 (SAT)')).toBeInTheDocument();
  });

  it('renders arrival date for each stop', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByText('13 JUL 2027 (SUN)')).toBeInTheDocument();
  });

  it('renders the hotel name', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByText('Verona Hotel')).toBeInTheDocument();
  });

  it('renders hotel type and nights', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByText('Pre Hotel')).toBeInTheDocument();
    expect(screen.getByText('2 nights')).toBeInTheDocument();
  });

  it('renders two pairs of ItineraryRow items for multi-hotel', () => {
    render(<ExtensionsCard {...BASE_PROPS} stops={[STOP, STOP_2]} />);
    expect(screen.getByText('Verona Hotel')).toBeInTheDocument();
    expect(screen.getByText('Como Hotel')).toBeInTheDocument();
  });
});

describe('ExtensionsCard — description', () => {
  it('renders the bullet list description', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    for (const item of BULLETS) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('renders text description', () => {
    render(
      <ExtensionsCard
        category="pre"
        title="Extension Name"
        meta="4 NIGHTS"
        amount="$4,999.00"
        currencyCode="USD"
        stops={[STOP]}
        descriptionText="A great extension."
      />,
    );
    expect(screen.getByText('A great extension.')).toBeInTheDocument();
  });
});

describe('ExtensionsCard — checkbox', () => {
  it('renders the checkbox and label by default', () => {
    render(<ExtensionsCard {...BASE_PROPS} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Add this extension')).toBeInTheDocument();
  });

  it('does not render checkbox when soldOut=true', () => {
    render(<ExtensionsCard {...BASE_PROPS} soldOut />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('calls onCheckedChange when checkbox is clicked', async () => {
    const handler = vi.fn();
    render(<ExtensionsCard {...BASE_PROPS} onCheckedChange={handler} />);
    screen.getByRole('checkbox').click();
    expect(handler).toHaveBeenCalledWith(true);
  });
});

describe('ExtensionsCard — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<ExtensionsCard {...BASE_PROPS} />);
    expect(container.querySelector('[data-slot="extensions-card"]')).toBeTruthy();
  });

  it('forwards className to the root element', () => {
    const { container } = render(<ExtensionsCard {...BASE_PROPS} className="extra" />);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('forwards data-testid', () => {
    render(<ExtensionsCard {...BASE_PROPS} data-testid="card" />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});
