// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import type { CruiseContextItineraryItem } from './context-card.tsx';
import { CruiseContextCard } from './context-card.tsx';

// CruiseContextCard is the compact banner that keeps the sailing an agent is
// working on in view. It is read-only, so what matters is that every fact the
// agent needs survives (voyage identity, route, inventory), that the itinerary
// is driven by data rather than a variant name, and that neither the route
// arrow nor the low-inventory colour is the sole carrier of meaning.

const PACKAGE_ITINERARY: CruiseContextItineraryItem[] = [
  { variant: 'hotel', date: '01 JUL 2027 (SAT)', cityCode: 'ZUR', cityName: 'Zürich' },
  { variant: 'departure', date: '01 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
  { variant: 'arrival', date: '01 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
  { variant: 'hotel', date: '01 JUL 2027 (WED)', cityCode: 'PAR', cityName: 'Paris' },
];

const CRUISE_ONLY_ITINERARY: CruiseContextItineraryItem[] = [
  { variant: 'departure', date: '01 JUL 2027 (MON)', cityCode: 'BSL', cityName: 'Basel' },
  { variant: 'arrival', date: '01 JUL 2027 (MON)', cityCode: 'TRI', cityName: 'Trier' },
];

// Split so the extension case can OMIT ship/voyageCode rather than pass
// undefined, which exactOptionalPropertyTypes rejects.
const CORE = {
  category: 'rivers',
  title: 'Paris to the Swiss Alps',
  meta: 'EUR',
  from: 'Paris',
  to: 'Zürich',
  nightsLabel: '7 Cruise Nights / 11 Total Nights',
  itinerary: PACKAGE_ITINERARY,
} as const;

const BASE = { ...CORE, ship: 'Viking Herja', voyageCode: 'HRJ270426T' } as const;

describe('CruiseContextCard — voyage identity', () => {
  it('renders the title and the category chip label', () => {
    render(<CruiseContextCard {...BASE} />);
    expect(screen.getByText('Paris to the Swiss Alps')).toBeInTheDocument();
    expect(screen.getByText('Rivers')).toBeInTheDocument();
  });

  it('renders the currency, ship and voyage code in the meta strip', () => {
    render(<CruiseContextCard {...BASE} />);
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('Viking Herja')).toBeInTheDocument();
    expect(screen.getByText('HRJ270426T')).toBeInTheDocument();
  });

  // Ship and voyage code are optional so the banner can also carry an
  // extension, which has neither.
  it('omits the ship and voyage code when not supplied', () => {
    render(<CruiseContextCard {...CORE} />);
    expect(screen.queryByText('Viking Herja')).not.toBeInTheDocument();
    expect(screen.queryByText('HRJ270426T')).not.toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
  });
});

describe('CruiseContextCard — route', () => {
  it('renders the origin and destination', () => {
    render(<CruiseContextCard {...BASE} />);
    const route = screen.getByTestId('cruise-context-route');
    expect(within(route).getByText('Paris')).toBeInTheDocument();
    expect(within(route).getByText('Zürich')).toBeInTheDocument();
  });

  // The arrow is a decorative glyph, so the direction has to reach a screen
  // reader as a word (WCAG 1.4.1 — meaning not carried by the visual alone).
  it('names the direction in text rather than relying on the arrow glyph', () => {
    render(<CruiseContextCard {...BASE} />);
    const route = screen.getByTestId('cruise-context-route');
    expect(within(route).getByText('to')).toBeInTheDocument();
  });

  it('renders the nights label in the tag chip', () => {
    render(<CruiseContextCard {...BASE} />);
    expect(screen.getByText('7 Cruise Nights / 11 Total Nights')).toBeInTheDocument();
  });
});

describe('CruiseContextCard — itinerary', () => {
  it('renders one row per itinerary stop', () => {
    const { container } = render(<CruiseContextCard {...BASE} />);
    expect(container.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(4);
  });

  it('renders every stop date and city', () => {
    render(<CruiseContextCard {...BASE} />);
    expect(screen.getByText('01 JUL 2027 (SAT)')).toBeInTheDocument();
    expect(screen.getByText('Basel')).toBeInTheDocument();
    expect(screen.getByText('TRI')).toBeInTheDocument();
  });

  // Package vs cruise-only is the length and kind of this array, not a variant
  // flag: a package brackets the sailing with hotel nights, cruise-only does not.
  it('renders a shorter cruise-only itinerary from the same prop', () => {
    const { container } = render(<CruiseContextCard {...BASE} itinerary={CRUISE_ONLY_ITINERARY} />);
    expect(container.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(2);
    expect(screen.queryByText('01 JUL 2027 (SAT)')).not.toBeInTheDocument();
  });

  it('renders no rows and no divider for an empty itinerary', () => {
    const { container } = render(<CruiseContextCard {...BASE} itinerary={[]} />);
    expect(container.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(0);
    expect(container.querySelector('[data-slot="cruise-context-divider"]')).toBeNull();
  });
});

describe('CruiseContextCard — inventory', () => {
  it('renders the remaining count when supplied', () => {
    render(<CruiseContextCard {...BASE} remaining="9+ remaining" />);
    expect(screen.getByText('9+ remaining')).toBeInTheDocument();
  });

  it('omits the remaining count when not supplied', () => {
    render(<CruiseContextCard {...BASE} />);
    expect(screen.queryByTestId('cruise-context-remaining')).not.toBeInTheDocument();
  });

  it('is not flagged low by default', () => {
    render(<CruiseContextCard {...BASE} remaining="9+ remaining" />);
    expect(screen.getByTestId('cruise-context-remaining')).toHaveAttribute(
      'data-low-inventory',
      'false',
    );
  });

  it('flags low inventory when asked', () => {
    render(<CruiseContextCard {...BASE} remaining="7 remaining" lowInventory />);
    expect(screen.getByTestId('cruise-context-remaining')).toHaveAttribute(
      'data-low-inventory',
      'true',
    );
  });

  // Red vs navy is the whole visual signal, so the warning must also exist as
  // text for anyone who cannot see the colour.
  it('names the low-inventory warning for assistive tech', () => {
    render(<CruiseContextCard {...BASE} remaining="7 remaining" lowInventory />);
    expect(screen.getByText('Low availability')).toBeInTheDocument();
  });

  it('adds no warning text when inventory is healthy', () => {
    render(<CruiseContextCard {...BASE} remaining="9+ remaining" />);
    expect(screen.queryByText('Low availability')).not.toBeInTheDocument();
  });

  // lowInventory is independent of the itinerary: a package that is nearly sold
  // out must be able to warn too, which the Figma variant axis could not express.
  it('flags low inventory on a package itinerary as well', () => {
    const { container } = render(
      <CruiseContextCard {...BASE} remaining="3 remaining" lowInventory />,
    );
    expect(container.querySelectorAll('[data-slot="itinerary-row"]')).toHaveLength(4);
    expect(screen.getByTestId('cruise-context-remaining')).toHaveAttribute(
      'data-low-inventory',
      'true',
    );
  });
});

describe('CruiseContextCard — presentation', () => {
  it('applies a caller className to the card', () => {
    const { container } = render(<CruiseContextCard {...BASE} className="mt-4" />);
    expect(container.querySelector('[data-slot="cruise-context-card"]')).toHaveClass('mt-4');
  });
});
