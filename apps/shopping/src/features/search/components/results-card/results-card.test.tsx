// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
// fireEvent and vi are kept for the footer button callback tests below
import '../../../../test-setup.ts';
import { ResultsCard, type ResultsCardProps } from './results-card.tsx';

// ResultsCard assembles sub-components whose own tests cover rendering fidelity.
// These tests verify that the card wires them up correctly: the right props reach
// each sub-component and the interactive footer elements fire their callbacks.

const ITINERARY: ResultsCardProps['itinerary'] = [
  { variant: 'hotel', date: '01 JUL 2027 (SAT)', cityCode: 'BUD', cityName: 'Budapest' },
  { variant: 'sailing', date: '03 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
  { variant: 'port', date: '09 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
  { variant: 'hotel', date: '11 JUL 2027 (WED)', cityCode: 'VIE', cityName: 'Vienna' },
];

const COLUMNS: ResultsCardProps['pricingColumns'] = [
  {
    title: 'Explorer Suite',
    items: [
      { abbrev: 'ES1', price: '$114,799', statA: '10' },
      { abbrev: 'ES2', price: '$114,799', statA: '8' },
    ],
  },
  {
    title: 'Deluxe Veranda',
    items: [{ abbrev: 'DV1', price: '$44,200', statA: '12' }],
  },
];

const BASE: ResultsCardProps = {
  category: 'rivers',
  title: 'Paris to the Swiss Alps',
  meta: 'EUR',
  ship: 'Viking Herja',
  voyageCode: 'HRJ270426T',
  priceLabel: 'Starting at',
  amount: '$5,999.00',
  currencyCode: 'USD',
  from: 'Paris',
  to: 'Zürich',
  nightsLabel: '7 Cruise Nights / 11 Total Nights',
  remaining: '9+ remaining',
  itinerary: ITINERARY,
  pricingColumns: COLUMNS,
};

describe('ResultsCard — CardHeader', () => {
  it('renders the cruise title', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('Paris to the Swiss Alps')).toBeInTheDocument();
  });

  it('renders the category chip label', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('Rivers')).toBeInTheDocument();
  });

  it('renders the voyage code in the meta strip', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('HRJ270426T')).toBeInTheDocument();
  });
});

describe('ResultsCard — summary row', () => {
  it('renders origin and destination cities', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Zürich')).toBeInTheDocument();
  });

  it('renders the nights label in the tag chip', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('7 Cruise Nights / 11 Total Nights')).toBeInTheDocument();
  });

  it('renders the availability count', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('9+ remaining')).toBeInTheDocument();
  });

  it('omits the remaining text when the prop is not provided', () => {
    // exactOptionalPropertyTypes: omit the key rather than passing undefined
    const { remaining: _r, ...noRemaining } = BASE;
    render(<ResultsCard {...noRemaining} />);
    expect(screen.queryByText('9+ remaining')).not.toBeInTheDocument();
  });
});

describe('ResultsCard — itinerary panel', () => {
  it('renders all itinerary stop dates', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('01 JUL 2027 (SAT)')).toBeInTheDocument();
    expect(screen.getByText('03 JUL 2027 (MON)')).toBeInTheDocument();
    expect(screen.getByText('09 JUL 2027 (MON)')).toBeInTheDocument();
    expect(screen.getByText('11 JUL 2027 (WED)')).toBeInTheDocument();
  });
});

describe('ResultsCard — pricing panel', () => {
  it('renders each category column title', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('Explorer Suite')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Veranda')).toBeInTheDocument();
  });

  it('renders price line abbreviations', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByText('ES1')).toBeInTheDocument();
    expect(screen.getByText('DV1')).toBeInTheDocument();
  });
});

describe('ResultsCard — footer checkbox', () => {
  // "Select to compare" is a future feature — the checkbox is hidden until
  // the compare flow is implemented. These tests assert the hidden state.
  it('does not render the select-to-compare checkbox', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.queryByRole('checkbox', { name: /select to compare/i })).not.toBeInTheDocument();
  });
});

describe('ResultsCard — footer button', () => {
  it('renders the cruise details button', () => {
    render(<ResultsCard {...BASE} />);
    expect(screen.getByRole('button', { name: /cruise details/i })).toBeInTheDocument();
  });

  it('calls onCruiseDetails when the button is clicked', () => {
    const onCruiseDetails = vi.fn();
    render(<ResultsCard {...BASE} onCruiseDetails={onCruiseDetails} />);
    fireEvent.click(screen.getByRole('button', { name: /cruise details/i }));
    expect(onCruiseDetails).toHaveBeenCalledOnce();
  });
});
