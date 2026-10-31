// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { StateroomsDeckplan } from './staterooms-deckplan.tsx';

const CONVENTIONS = [
  { label: 'Fitness Center', color: '#a2bacb' },
  { label: 'The Nordic Spa', color: '#a2bacb' },
];

const PROPS = {
  sideviewSrc: '/sideview.svg',
  floorplanSrc: '/deck-01.svg',
  conventions: CONVENTIONS,
};

describe('StateroomsDeckplan — content', () => {
  it('renders the ship sideview image', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    expect(screen.getByAltText('ship sideview')).toHaveAttribute('src', '/sideview.svg');
  });

  it('renders the deck floor plan image', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    expect(screen.getByAltText('deck floor plan')).toHaveAttribute('src', '/deck-01.svg');
  });

  it('puts the deck floor plan on top and the ship sideview below it', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    const deck = screen.getByAltText('deck floor plan');
    const sideview = screen.getByAltText('ship sideview');
    expect(deck.compareDocumentPosition(sideview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the conventions directly below the deck floor plan, above the sideview', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    const deck = screen.getByAltText('deck floor plan');
    const legend = screen.getByText('Fitness Center');
    const sideview = screen.getByAltText('ship sideview');
    expect(deck.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      legend.compareDocumentPosition(sideview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('crops the blank band the artwork leaves above the ship', () => {
    // happy-dom does no SVG layout (its getBBox returns zeros), so the content box is stubbed.
    Object.defineProperty(SVGSVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => ({ x: 0, y: 82, width: 850, height: 112 }),
    });
    render(
      <StateroomsDeckplan
        {...PROPS}
        floorplanRaw={'<svg viewBox="0 0 850 250"><rect y="82" height="112"></rect></svg>'}
      />,
    );
    const svg = document.querySelector('[data-slot="deckplan-floorplan"] svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 74 850 176');
    Reflect.deleteProperty(SVGSVGElement.prototype, 'getBBox');
  });

  it('keeps the crop steady while the cabin highlight changes, measuring the drawing once', () => {
    // Hovering a cabin re-renders the plan. Re-cropping on each hover resized the panel under
    // the pointer, so the click landed on a different row.
    const getBBox = vi.fn(() => ({ x: 0, y: 82, width: 850, height: 112 }));
    Object.defineProperty(SVGSVGElement.prototype, 'getBBox', {
      configurable: true,
      value: getBBox,
    });
    const raw = '<svg viewBox="0 0 850 250"><g id="room-5034-PV2"><rect></rect></g></svg>';
    const { rerender } = render(
      <StateroomsDeckplan {...PROPS} floorplanRaw={raw} highlightCategory="PV2" />,
    );
    for (const cabin of ['5034', '5016', '5034']) {
      rerender(
        <StateroomsDeckplan
          {...PROPS}
          floorplanRaw={raw}
          highlightCategory="PV2"
          highlightCabin={cabin}
        />,
      );
      const svg = document.querySelector('[data-slot="deckplan-floorplan"] svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 74 850 176');
    }
    expect(getBBox).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(SVGSVGElement.prototype, 'getBBox');
  });

  // The sideview artwork leaves its lower half blank, which rendered as a ~240px gap between
  // the ship and the expand control. Cropped once per drawing, like the floor plan's top band —
  // switching deck re-highlights the sideview and must not re-measure or resize it.
  it('crops the blank band the sideview leaves below the ship, measuring it once', () => {
    const getBBox = vi.fn(() => ({ x: 0, y: 0, width: 805, height: 150 }));
    Object.defineProperty(SVGSVGElement.prototype, 'getBBox', {
      configurable: true,
      value: getBBox,
    });
    const sideviewRaw =
      '<svg viewBox="0 0 805 293"><g id="deck-1"><rect></rect></g><g id="deck-2"><rect></rect></g></svg>';
    const { rerender } = render(
      <StateroomsDeckplan {...PROPS} sideviewRaw={sideviewRaw} activeDeckLayerId="deck-1" />,
    );
    const viewBox = () =>
      document.querySelector('[data-slot="deckplan-sideview"] svg')?.getAttribute('viewBox');
    expect(viewBox()).toBe('0 0 805 158');

    rerender(
      <StateroomsDeckplan {...PROPS} sideviewRaw={sideviewRaw} activeDeckLayerId="deck-2" />,
    );
    expect(viewBox()).toBe('0 0 805 158');
    expect(getBBox).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(SVGSVGElement.prototype, 'getBBox');
  });

  it('renders convention items in the legend', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    expect(screen.getByText('Fitness Center')).toBeInTheDocument();
    expect(screen.getByText('The Nordic Spa')).toBeInTheDocument();
  });

  it('renders the expand button', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });
});

describe('StateroomsDeckplan — expand toggle', () => {
  it('has aria-label "expand" when not expanded', () => {
    render(<StateroomsDeckplan {...PROPS} isExpanded={false} />);
    expect(screen.getByRole('button', { name: 'expand' })).toBeInTheDocument();
  });

  it('has aria-label "collapse" when expanded', () => {
    render(<StateroomsDeckplan {...PROPS} isExpanded={true} />);
    expect(screen.getByRole('button', { name: 'collapse' })).toBeInTheDocument();
  });

  it('calls onExpandToggle when the button is clicked', () => {
    const spy = vi.fn();
    render(<StateroomsDeckplan {...PROPS} onExpandToggle={spy} />);
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('StateroomsDeckplan — slot and HTML forwarding', () => {
  it('exposes data-slot for selector targeting', () => {
    const { container } = render(<StateroomsDeckplan {...PROPS} />);
    expect(container.querySelector('[data-slot="staterooms-deckplan"]')).toBeTruthy();
  });

  it('forwards className to the root element', () => {
    const { container } = render(<StateroomsDeckplan {...PROPS} className="my-extra" />);
    expect(container.firstChild).toHaveClass('my-extra');
  });

  it('forwards data-testid', () => {
    render(<StateroomsDeckplan {...PROPS} data-testid="deckplan" />);
    expect(screen.getByTestId('deckplan')).toBeInTheDocument();
  });

  // 20px either side of both drawings, 32px above the floor plan and below the sideview, so
  // the artwork never runs into the card edge.
  it('pads the drawings 20px horizontally and 32px top and bottom', () => {
    render(<StateroomsDeckplan {...PROPS} />);
    const floorplan = screen.getByAltText('deck floor plan');
    expect(floorplan).toHaveClass('px-5', 'pt-8');
    const sideview = screen.getByAltText('ship sideview');
    expect(sideview).toHaveClass('px-5', 'pb-8');
  });
});
