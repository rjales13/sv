// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { Accordion } from '@vikings/ui/components/accordion';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { ItineraryDetail, type ItineraryDetailProps } from './itinerary-detail.tsx';

// ItineraryDetail is the expandable day row of a cruise itinerary (ShoppingApp_UX-VD
// node 906:118908). Figma ships it as five flat variants; the component reproduces
// them from three orthogonal inputs — whether a day stamp is present, whether that
// stamp spans a range, and whether the row is open. These tests pin that mapping,
// because the variant-to-prop translation is the part a reader cannot infer from
// the markup alone.
//
// The row is an AccordionItem, so every case renders inside an Accordion root —
// that root is what owns the open state and gives the day headers roving focus.

const OVERVIEW =
  'Arrive and check in to your hotel. Long a hub of French culture and cuisine, Paris is one of the most romantic destinations in the world.';

const DAY = { ordinal: 'DAY 1', date: '01 JUL (MON)' };
const THROUGH = { ordinal: 'DAY 5', date: '05 JUL (MON)' };

// `exactOptionalPropertyTypes` makes an explicit `undefined` a type error, so the
// absent-prop cases build up from CORE instead of overriding BASE with undefined.
const CORE = {
  value: 'paris',
  port: 'Paris, France (PAR)',
  variant: 'hotel',
  label: 'Paris Hotel',
  tags: ['Board 3:00 PM', 'Overnight', 'Attribute'],
  summary: 'Admire iconic landmarks, such as the Eiffel Tower and Arc de Triomphe.',
} satisfies Omit<ItineraryDetailProps, 'day' | 'through' | 'overview'>;

const BASE: ItineraryDetailProps = { ...CORE, day: DAY, overview: OVERVIEW };

describe('ItineraryDetail — content', () => {
  it('renders the day stamp, port, detail label and summary', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    expect(screen.getByText('DAY 1')).toBeInTheDocument();
    expect(screen.getByText('01 JUL (MON)')).toBeInTheDocument();
    // The port also appears sr-only inside the trigger, naming the control; this
    // asserts the visible headline.
    expect(screen.getByText('Paris, France (PAR)', { ignore: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByText('Paris Hotel')).toBeInTheDocument();
    expect(screen.getByText(BASE.summary)).toBeInTheDocument();
  });

  it('renders one badge per tag', () => {
    const { container } = render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    const badges = container.querySelectorAll('[data-slot="badge"]');
    expect(badges).toHaveLength(3);
    expect(screen.getByText('Board 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Overnight')).toBeInTheDocument();
    expect(screen.getByText('Attribute')).toBeInTheDocument();
  });

  // The tag strip is optional in Figma (the `tags` boolean); an absent list is a
  // legitimate state rather than something to guard against.
  it('renders no badges when tags are omitted', () => {
    const { container } = render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} tags={[]} />
      </Accordion>,
    );

    expect(container.querySelectorAll('[data-slot="badge"]')).toHaveLength(0);
  });

  // Figma "Variant4": a continuation row for a stop that shares the day above it.
  // The bullet column keeps its space so the body stays aligned with its siblings.
  it('drops the day stamp but keeps the bullet gutter on a continuation row', () => {
    const { container } = render(
      <Accordion type="multiple">
        <ItineraryDetail {...CORE} overview={OVERVIEW} />
      </Accordion>,
    );

    expect(screen.queryByText('DAY 1')).not.toBeInTheDocument();
    expect(screen.getByText('Paris, France (PAR)')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="itinerary-detail-bullet"]')).toBeInTheDocument();
  });
});

describe('ItineraryDetail — day range', () => {
  it('renders the closing stamp when the stop spans a range', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} through={THROUGH} />
      </Accordion>,
    );

    expect(screen.getByText('DAY 5')).toBeInTheDocument();
    expect(screen.getByText('05 JUL (MON)')).toBeInTheDocument();
  });

  // Figma "Single day" — the rule and second stamp collapse away entirely.
  it('omits the closing stamp on a single-day stop', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    expect(screen.queryByText('DAY 5')).not.toBeInTheDocument();
  });

  // `through` has no anchor without an opening stamp, so it must not leak into a
  // continuation row that deliberately hides its day header.
  it('ignores a closing stamp when there is no opening stamp', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...CORE} through={THROUGH} overview={OVERVIEW} />
      </Accordion>,
    );

    expect(screen.queryByText('DAY 5')).not.toBeInTheDocument();
  });
});

describe('ItineraryDetail — expansion', () => {
  it('keeps the overview hidden until the row is opened', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    expect(screen.queryByText(OVERVIEW)).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('reveals the overview when the trigger is activated', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(OVERVIEW)).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts open when the parent accordion names it', () => {
    render(
      <Accordion type="multiple" defaultValue={['paris']}>
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    expect(screen.getByText(OVERVIEW)).toBeInTheDocument();
  });

  // Controlled mode lets a parent itinerary drive "expand all" without each row
  // holding its own conflicting copy of the state.
  it('honours a controlled value and reports intent upward', () => {
    const onValueChange = vi.fn();
    render(
      <Accordion type="multiple" value={[]} onValueChange={onValueChange}>
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onValueChange).toHaveBeenCalledWith(['paris']);
    // Still closed — the parent owns the value and has not pushed a new one back.
    expect(screen.queryByText(OVERVIEW)).not.toBeInTheDocument();
  });

  // Without overview copy there is nothing to reveal, so the affordance must not
  // appear — a chevron that opens an empty region is a dead control.
  it('renders no trigger when there is no overview', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...CORE} day={DAY} />
      </Accordion>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Paris, France (PAR)')).toBeInTheDocument();
  });

  // The visible trigger text is only a date, so the stop is named for assistive
  // tech too — otherwise every day header in the list sounds interchangeable.
  it('names the trigger after both the day and the port', () => {
    render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} />
      </Accordion>,
    );

    expect(
      screen.getByRole('button', { name: /DAY 1.*Paris, France \(PAR\)/ }),
    ).toBeInTheDocument();
  });
});

describe('ItineraryDetail — presentation', () => {
  it('applies a caller className to the row', () => {
    const { container } = render(
      <Accordion type="multiple">
        <ItineraryDetail {...BASE} className="mt-4" />
      </Accordion>,
    );

    expect(container.querySelector('[data-slot="itinerary-detail"]')).toHaveClass('mt-4');
  });
});
