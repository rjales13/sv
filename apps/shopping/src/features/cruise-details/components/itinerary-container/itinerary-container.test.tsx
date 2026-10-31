// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../../test-setup.ts';
import {
  BULLET_CENTRE_CLOSED,
  BULLET_CENTRE_OPEN,
  ItineraryContainer,
  type ItineraryContainerStop,
} from './itinerary-container.tsx';

// ItineraryContainer is the card that stacks a sailing's days (ShoppingApp_UX-VD
// node 2222:422764). Its one piece of real logic is the route spine — the rail
// threading the day bullets. Figma draws it as a fixed 1555px rectangle, which is
// correct only while every row is collapsed: the sibling frame 2222:422854 opens
// one row, grows 166px, and the rail falls 165px short of the last two bullets.
// These tests pin the rule that replaces it — the rail spans the FIRST bullet's
// centre to the LAST bullet's centre, and re-anchors when either row opens.

const OVERVIEW = 'Arrive and check in to your hotel, long a hub of French culture and cuisine.';

const STOPS: ItineraryContainerStop[] = [
  {
    id: 'paris',
    day: { ordinal: 'DAY 1', date: '01 JUL (MON)' },
    port: 'Paris, France (PAR)',
    variant: 'hotel',
    label: 'Paris Hotel',
    tags: ['Overnight'],
    summary: 'Admire iconic landmarks, such as the Eiffel Tower.',
    overview: OVERVIEW,
  },
  {
    id: 'trier',
    day: { ordinal: 'DAY 3', date: '03 JUL (WED)' },
    port: 'Trier, Germany (TRI)',
    variant: 'port',
    label: 'Dock',
    summary: 'Explore the highlights of Germany’s oldest city.',
    overview: OVERVIEW,
  },
  {
    id: 'zurich',
    day: { ordinal: 'DAY 11', date: '11 JUL (THU)' },
    port: 'Zurich, Switzerland (ZRH)',
    variant: 'hotel',
    label: 'Zurich Hotel',
    summary: 'See landmarks including the Rathaus.',
    overview: OVERVIEW,
  },
];

const spines = (c: HTMLElement) => [
  ...c.querySelectorAll<HTMLElement>('[data-slot="itinerary-container-spine"]'),
];

describe('ItineraryContainer — stops', () => {
  it('renders one row per stop, in order', () => {
    render(<ItineraryContainer stops={STOPS} />);

    // Ports read "City, Country (CODE)"; the comma keeps date stamps like
    // "03 JUL (WED)" out of the match, and `ignore` drops the sr-only copy each
    // trigger carries to name itself.
    const ports = screen
      .getAllByText(/, .+ \(\w+\)$/, { ignore: '.sr-only' })
      .map((el) => el.textContent);
    expect(ports).toEqual([
      'Paris, France (PAR)',
      'Trier, Germany (TRI)',
      'Zurich, Switzerland (ZRH)',
    ]);
  });

  it('renders an empty card for an empty itinerary', () => {
    const { container } = render(<ItineraryContainer stops={[]} />);

    expect(container.querySelector('[data-slot="itinerary-container"]')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('ItineraryContainer — route spine', () => {
  // The rail is assembled per row rather than as one fixed-height rectangle:
  // each row owns the segment from its own bullet downward, so no row height is
  // ever assumed and the rail cannot go stale the way the Figma rect did.
  it('draws a segment for every row when there are several stops', () => {
    const { container } = render(<ItineraryContainer stops={STOPS} />);

    expect(spines(container)).toHaveLength(STOPS.length);
  });

  // One stop means the first and last bullet are the same point, so there is
  // nothing to connect.
  it('draws no segment for a single stop', () => {
    const { container } = render(
      <ItineraryContainer stops={[STOPS[0] as ItineraryContainerStop]} />,
    );

    expect(spines(container)).toHaveLength(0);
  });

  it('starts the rail at the first bullet centre and runs it past the row', () => {
    const { container } = render(<ItineraryContainer stops={STOPS} />);

    const first = spines(container)[0] as HTMLElement;
    expect(first.style.top).toBe(`${BULLET_CENTRE_CLOSED}px`);
    expect(first.style.bottom).toBe('-12px');
  });

  it('stops the rail at the last bullet centre', () => {
    const { container } = render(<ItineraryContainer stops={STOPS} />);

    const last = spines(container).at(-1) as HTMLElement;
    expect(last.style.top).toBe('0px');
    expect(last.style.height).toBe(`${BULLET_CENTRE_CLOSED}px`);
    // The last row must not trail a segment into empty space below the card.
    expect(last.style.bottom).toBe('');
  });

  it('runs a middle row edge to edge so the rail stays continuous', () => {
    const { container } = render(<ItineraryContainer stops={STOPS} />);

    const middle = spines(container)[1] as HTMLElement;
    expect(middle.style.top).toBe('0px');
    expect(middle.style.bottom).toBe('-12px');
  });
});

describe('ItineraryContainer — expansion drives the rail', () => {
  // This is the bug baked into the Figma file: opening a row moves its bullet
  // 8px further down (padding 8 → 16), and a fixed rail no longer meets it.
  it('re-anchors the rail when the first row opens', () => {
    const { container } = render(
      <ItineraryContainer stops={STOPS} defaultExpandedIds={['paris']} />,
    );

    expect((spines(container)[0] as HTMLElement).style.top).toBe(`${BULLET_CENTRE_OPEN}px`);
  });

  it('re-anchors the rail when the last row opens', () => {
    const { container } = render(
      <ItineraryContainer stops={STOPS} defaultExpandedIds={['zurich']} />,
    );

    expect((spines(container).at(-1) as HTMLElement).style.height).toBe(`${BULLET_CENTRE_OPEN}px`);
  });

  it('leaves the rail anchored when a middle row opens', () => {
    const { container } = render(
      <ItineraryContainer stops={STOPS} defaultExpandedIds={['trier']} />,
    );

    expect((spines(container)[0] as HTMLElement).style.top).toBe(`${BULLET_CENTRE_CLOSED}px`);
    expect((spines(container).at(-1) as HTMLElement).style.height).toBe(
      `${BULLET_CENTRE_CLOSED}px`,
    );
  });

  it('moves the rail anchor when the first row is opened through its chevron', () => {
    const { container } = render(<ItineraryContainer stops={STOPS} />);

    expect((spines(container)[0] as HTMLElement).style.top).toBe(`${BULLET_CENTRE_CLOSED}px`);

    fireEvent.click(screen.getAllByRole('button')[0] as HTMLElement);

    expect(screen.getByText(OVERVIEW)).toBeInTheDocument();
    expect((spines(container)[0] as HTMLElement).style.top).toBe(`${BULLET_CENTRE_OPEN}px`);
  });

  it('returns the rail anchor when the first row is closed again', () => {
    const { container } = render(
      <ItineraryContainer stops={STOPS} defaultExpandedIds={['paris']} />,
    );

    fireEvent.click(screen.getAllByRole('button')[0] as HTMLElement);

    expect(screen.queryByText(OVERVIEW)).not.toBeInTheDocument();
    expect((spines(container)[0] as HTMLElement).style.top).toBe(`${BULLET_CENTRE_CLOSED}px`);
  });

  // Only one row is open at a time — opening a second collapses the first.
  it('collapses the open row when another is expanded', () => {
    render(<ItineraryContainer stops={STOPS} defaultExpandedIds={['paris']} />);

    fireEvent.click(screen.getAllByRole('button')[1] as HTMLElement);

    expect(screen.getAllByText(OVERVIEW)).toHaveLength(1);
  });
});

describe('ItineraryContainer — presentation', () => {
  it('applies a caller className to the card', () => {
    const { container } = render(<ItineraryContainer stops={STOPS} className="mt-4" />);

    expect(container.querySelector('[data-slot="itinerary-container"]')).toHaveClass('mt-4');
  });
});
