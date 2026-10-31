import { describe, expect, it } from 'vitest';
import {
  clampOffset,
  clampScale,
  contentSize,
  FIT_SCALE,
  fillState,
  fitState,
  MAX_SCALE,
  offsetAfterZoom,
  panBy,
  zoomTo,
} from './zoom-pan.ts';

/** A frame roughly the size the expand dialog gives the plan. */
const VIEWPORT = { width: 1200, height: 520 };

/** The Polaris's deck 2 at fit: 800×108 in its viewBox, so 7.4:1. */
const STRIP_FIT = { width: 1200, height: 162 };

describe('clampScale', () => {
  it('never goes below the whole deck, or past what the drawing can show', () => {
    expect(clampScale(0.2)).toBe(FIT_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(2.5)).toBe(2.5);
  });
});

describe('clampOffset', () => {
  it('centres an axis the drawing does not fill', () => {
    // A 7:1 strip is 162px tall in a 520px frame — pinning it to the top would read as broken.
    const { y } = clampOffset({ x: 0, y: -400 }, STRIP_FIT, VIEWPORT);
    expect(y).toBe((VIEWPORT.height - STRIP_FIT.height) / 2);
  });

  it('lets an overflowing edge reach the frame edge and no further', () => {
    const content = contentSize(STRIP_FIT, 3); // 3600 wide in a 1200 frame
    expect(clampOffset({ x: 500, y: 0 }, content, VIEWPORT).x).toBe(0);
    expect(clampOffset({ x: -9999, y: 0 }, content, VIEWPORT).x).toBe(-(3600 - 1200));
  });

  it('leaves an offset inside the bounds alone', () => {
    const content = contentSize(STRIP_FIT, 3);
    expect(clampOffset({ x: -1000, y: 0 }, content, VIEWPORT).x).toBe(-1000);
  });
});

describe('offsetAfterZoom', () => {
  it('holds the pivot still', () => {
    const pivot = { x: 300, y: 80 };
    const before = { x: -100, y: -20 };

    const after = offsetAfterZoom(pivot, before, 1, 2);

    // The drawing point under the pivot must still be under it afterwards.
    const pointBefore = { x: (pivot.x - before.x) / 1, y: (pivot.y - before.y) / 1 };
    const pointAfter = { x: (pivot.x - after.x) / 2, y: (pivot.y - after.y) / 2 };
    expect(pointAfter.x).toBeCloseTo(pointBefore.x, 6);
    expect(pointAfter.y).toBeCloseTo(pointBefore.y, 6);
  });
});

describe('zoomTo', () => {
  it('keeps the cabin under the cursor under the cursor', () => {
    const start = fitState(STRIP_FIT, VIEWPORT);
    const pivot = { x: 900, y: 100 };

    const zoomed = zoomTo(start, 3, pivot, STRIP_FIT, VIEWPORT);

    expect(zoomed.scale).toBe(3);
    const before = (pivot.x - start.offset.x) / start.scale;
    const after = (pivot.x - zoomed.offset.x) / zoomed.scale;
    expect(after).toBeCloseTo(before, 6);
  });

  it('refuses to zoom out past the whole deck', () => {
    const start = fitState(STRIP_FIT, VIEWPORT);
    expect(zoomTo(start, 0.5, { x: 0, y: 0 }, STRIP_FIT, VIEWPORT)).toBe(start);
  });

  it('clamps the result back inside the frame', () => {
    // Zooming hard against the right edge must not strand the drawing off screen.
    const start = fitState(STRIP_FIT, VIEWPORT);
    const zoomed = zoomTo(start, MAX_SCALE, { x: VIEWPORT.width, y: 0 }, STRIP_FIT, VIEWPORT);
    const content = contentSize(STRIP_FIT, zoomed.scale);

    expect(zoomed.offset.x).toBeLessThanOrEqual(0);
    expect(zoomed.offset.x).toBeGreaterThanOrEqual(-(content.width - VIEWPORT.width));
  });
});

describe('panBy', () => {
  it('moves the drawing and holds the scale', () => {
    const zoomed = zoomTo(fitState(STRIP_FIT, VIEWPORT), 3, { x: 600, y: 80 }, STRIP_FIT, VIEWPORT);
    const panned = panBy(zoomed, { x: -120, y: 0 }, STRIP_FIT, VIEWPORT);

    expect(panned.scale).toBe(zoomed.scale);
    expect(panned.offset.x).toBe(zoomed.offset.x - 120);
  });

  it('cannot drag the drawing out of the frame', () => {
    const fit = fitState(STRIP_FIT, VIEWPORT);
    // At fit there is nothing to pan to, so a drag changes nothing.
    expect(panBy(fit, { x: 400, y: 400 }, STRIP_FIT, VIEWPORT).offset).toEqual(fit.offset);
  });
});

describe('fitState', () => {
  it('shows the whole deck, vertically centred', () => {
    const state = fitState(STRIP_FIT, VIEWPORT);
    expect(state.scale).toBe(FIT_SCALE);
    expect(state.offset.x).toBe(0);
    expect(state.offset.y).toBe((VIEWPORT.height - STRIP_FIT.height) / 2);
  });
});

describe('fillState', () => {
  it('opens the drawing filling the frame, not merely fitting its width', () => {
    const state = fillState(STRIP_FIT, VIEWPORT);

    // 520px of frame over a 162px strip — the whole point is that this is well past 1.
    expect(state.scale).toBeGreaterThan(FIT_SCALE);
    expect(contentSize(STRIP_FIT, state.scale).height).toBeCloseTo(VIEWPORT.height, 6);
  });

  it('opens amidships, so the agent is not looking at the bow', () => {
    const state = fillState(STRIP_FIT, VIEWPORT);
    const content = contentSize(STRIP_FIT, state.scale);
    const shownCentre = (VIEWPORT.width / 2 - state.offset.x) / state.scale;

    expect(shownCentre).toBeCloseTo(content.width / state.scale / 2, 6);
  });

  it('never opens past the zoom ceiling', () => {
    // A nearly-square drawing would otherwise fill a tall frame at an absurd magnification.
    const square = { width: 1200, height: 1200 };
    expect(fillState(square, { width: 1200, height: 20000 }).scale).toBe(MAX_SCALE);
  });

  it('falls back to fit when the drawing has not been measured yet', () => {
    expect(fillState({ width: 0, height: 0 }, VIEWPORT).scale).toBe(FIT_SCALE);
  });
});
