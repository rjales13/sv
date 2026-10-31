import { describe, expect, it } from 'vitest';
import { cropBottomViewBox, cropTopViewBox, withViewBox } from './deck-plan-crop.ts';

// The delivered OVS deck plans: viewBox 0 0 850 250, ship drawn from y≈82 to y≈194.
const VIEWBOX = { x: 0, y: 0, width: 850, height: 250 };

describe('cropTopViewBox', () => {
  it('drops the blank band above the ship, keeping a small margin', () => {
    expect(cropTopViewBox(VIEWBOX, { y: 82, height: 112 }, 8)).toBe('0 74 850 176');
  });

  it('leaves the bottom of the drawing where it was', () => {
    const [, y, , height] = (cropTopViewBox(VIEWBOX, { y: 82, height: 112 }, 8) ?? '')
      .split(' ')
      .map(Number);
    expect((y ?? 0) + (height ?? 0)).toBe(250);
  });

  it('never crops into the artwork when it already reaches the top', () => {
    expect(cropTopViewBox(VIEWBOX, { y: 3, height: 190 }, 8)).toBe('0 0 850 250');
  });

  it('returns undefined when there is nothing measurable to crop', () => {
    expect(cropTopViewBox({ ...VIEWBOX, height: 0 }, { y: 82, height: 112 }, 8)).toBeUndefined();
    expect(cropTopViewBox(VIEWBOX, { y: 0, height: 0 }, 8)).toBeUndefined();
  });
});

// The HID sideview: viewBox 0 0 805.747 293.288, labels and ship drawn from y≈0 to y≈150 —
// the lower half is blank, ~240px at panel width between the ship and the expand control.
const SIDEVIEW = { x: 0, y: 0, width: 805, height: 293 };

describe('cropBottomViewBox', () => {
  it('drops the blank band below the ship, keeping a small margin', () => {
    expect(cropBottomViewBox(SIDEVIEW, { y: 0, height: 150 }, 8)).toBe('0 0 805 158');
  });

  it('leaves the top of the drawing — its deck labels — where it was', () => {
    expect(cropBottomViewBox({ ...SIDEVIEW, y: -10 }, { y: -4, height: 150 }, 8)).toBe(
      '0 -10 805 164',
    );
  });

  it('never crops into the artwork when it already reaches the bottom', () => {
    expect(cropBottomViewBox(SIDEVIEW, { y: 0, height: 290 }, 8)).toBe('0 0 805 293');
  });

  it('returns undefined when there is nothing measurable to crop', () => {
    expect(cropBottomViewBox({ ...SIDEVIEW, height: 0 }, { y: 0, height: 150 }, 8)).toBeUndefined();
    expect(cropBottomViewBox(SIDEVIEW, { y: 0, height: 0 }, 8)).toBeUndefined();
  });
});

describe('withViewBox', () => {
  const SVG =
    '<?xml version="1.0"?><svg id="xi-class-deck-5" viewBox="0 0 850 250"><style>x</style><rect viewBox="keep"></rect></svg>';

  it('rewrites the root viewBox only', () => {
    expect(withViewBox(SVG, '0 74 850 176')).toBe(
      '<?xml version="1.0"?><svg id="xi-class-deck-5" viewBox="0 74 850 176"><style>x</style><rect viewBox="keep"></rect></svg>',
    );
  });

  it('returns the markup untouched when there is no crop yet', () => {
    expect(withViewBox(SVG, undefined)).toBe(SVG);
  });

  it('returns the markup untouched when the root has no viewBox to replace', () => {
    const bare = '<svg id="plain"><rect></rect></svg>';
    expect(withViewBox(bare, '0 74 850 176')).toBe(bare);
  });
});
