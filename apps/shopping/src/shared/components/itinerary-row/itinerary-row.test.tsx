// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import type { ItineraryVariant } from './itinerary-row.tsx';
import { ItineraryRow } from './itinerary-row.tsx';

// ItineraryRow is presentational. On a live call the agent reads a day off the
// itinerary, so what matters is that the date and the place stay attached to
// each other and that the decorative separator never reaches assistive tech.

const DAY = {
  date: '01 JUL 2027 (FRI)',
  cityCode: 'BUD',
  cityName: 'Budapest',
} as const;

describe('ItineraryRow — content', () => {
  it('renders the date, the city code and the city name', () => {
    render(<ItineraryRow {...DAY} variant="hotel" />);
    expect(screen.getByText('01 JUL 2027 (FRI)')).toBeInTheDocument();
    expect(screen.getByText('BUD')).toBeInTheDocument();
    expect(screen.getByText('Budapest')).toBeInTheDocument();
  });

  it('renders an icon for every variant', () => {
    const variants: ItineraryVariant[] = ['hotel', 'sailing', 'port'];
    for (const variant of variants) {
      const { container, unmount } = render(<ItineraryRow {...DAY} variant={variant} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      unmount();
    }
  });

  // A city code is a booking identifier — trimming or re-casing it would send
  // the agent to the wrong port, so it must survive verbatim.
  it('renders the city code verbatim', () => {
    render(<ItineraryRow {...DAY} variant="hotel" cityCode="AMS" />);
    expect(screen.getByText('AMS')).toBeInTheDocument();
    expect(screen.queryByText('BUD')).not.toBeInTheDocument();
  });

  it('renders a city name that carries diacritics unchanged', () => {
    render(<ItineraryRow {...DAY} variant="hotel" cityCode="ZRH" cityName="Zürich" />);
    expect(screen.getByText('Zürich')).toBeInTheDocument();
  });
});

describe('ItineraryRow — presentation', () => {
  it('hides the separator dot from assistive tech', () => {
    render(<ItineraryRow {...DAY} variant="hotel" />);
    const dot = screen.getByText('·');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies a caller className to the row', () => {
    const { container } = render(<ItineraryRow {...DAY} variant="hotel" className="w-40" />);
    expect(container.firstElementChild).toHaveClass('w-40');
  });

  it('keeps the caller className alongside the layout classes', () => {
    const { container } = render(<ItineraryRow {...DAY} variant="hotel" className="w-40" />);
    expect(container.firstElementChild).toHaveClass('flex');
  });
});
