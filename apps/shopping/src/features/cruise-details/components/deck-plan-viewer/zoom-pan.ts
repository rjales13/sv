/*
  Zoom-and-pan arithmetic for the deck-plan detail view.

  Kept pure and out of the component because the fiddly parts — keeping the point under the
  cursor still while zooming, and refusing to let the drawing be dragged off screen — are
  exactly the parts worth testing and the parts that feel wrong when they are subtly off.

  Model: the drawing is laid out at FIT size (its width equals the viewport's) and then
  transformed with `translate(offset) scale(scale)`, origin top-left. So `scale: 1` always means
  "the whole deck is visible", whatever the viewport happens to be, and the deck plans' extreme
  aspect ratios — 3.4:1 on the ocean ships, 7.4:1 on the Polaris — never enter the sums.
*/

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Whole deck visible. */
export const FIT_SCALE = 1;

/**
 * Far enough in to read a cabin number.
 *
 * At fit, the Polaris's deck 2 renders its 7.7px labels at roughly 1/7 of their drawn size;
 * 6× brings them back to comfortably legible without letting the agent get lost in a drawing
 * that carries no more detail to reveal.
 */
export const MAX_SCALE = 6;

/** Step for the +/− controls and the keyboard. Multiplicative, so each press feels equal. */
export const ZOOM_STEP = 1.4;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(FIT_SCALE, scale));
}

/**
 * Keeps the drawing inside its frame.
 *
 * Along an axis where the content overflows, the offset is bounded so an edge can reach the
 * frame's edge but no further — dragging past it would leave the agent looking at blank space.
 * Along an axis where it does NOT overflow (always true at fit, and true vertically for a long
 * strip even when zoomed), the content is centred instead, because a short drawing pinned to
 * the top of a tall frame reads as broken rather than deliberate.
 */
export function clampOffset(offset: Point, content: Size, viewport: Size): Point {
  const axis = (value: number, contentLength: number, viewportLength: number): number => {
    const overflow = contentLength - viewportLength;
    // Fits: centre it. The offset is POSITIVE here — the drawing moves down/right into the
    // middle of the frame, which is the opposite sign to the overflow case below.
    if (overflow <= 0) return (viewportLength - contentLength) / 2;
    return Math.min(0, Math.max(-overflow, value));
  };

  return {
    x: axis(offset.x, content.width, viewport.width),
    y: axis(offset.y, content.height, viewport.height),
  };
}

/** The drawing's rendered size at a given scale, given its fit size. */
export function contentSize(fit: Size, scale: number): Size {
  return { width: fit.width * scale, height: fit.height * scale };
}

/**
 * The offset that holds `pivot` still while the scale changes.
 *
 * `pivot` is in viewport coordinates — the pointer, or the frame's centre for the buttons and
 * the keyboard. Without this, zooming walks the drawing away from whatever the agent was
 * looking at, which is the difference between a viewer that feels direct and one that lurches.
 */
export function offsetAfterZoom(
  pivot: Point,
  offset: Point,
  fromScale: number,
  toScale: number,
): Point {
  const ratio = toScale / fromScale;
  return {
    x: pivot.x - (pivot.x - offset.x) * ratio,
    y: pivot.y - (pivot.y - offset.y) * ratio,
  };
}

export interface ViewState {
  scale: number;
  offset: Point;
}

/** Applies a scale change about a pivot, then re-clamps — the one path every zoom goes through. */
export function zoomTo(
  state: ViewState,
  nextScale: number,
  pivot: Point,
  fit: Size,
  viewport: Size,
): ViewState {
  const scale = clampScale(nextScale);
  if (scale === state.scale) return state;

  const offset = offsetAfterZoom(pivot, state.offset, state.scale, scale);
  return { scale, offset: clampOffset(offset, contentSize(fit, scale), viewport) };
}

/** Applies a drag or a wheel pan, then re-clamps. */
export function panBy(state: ViewState, delta: Point, fit: Size, viewport: Size): ViewState {
  const offset = { x: state.offset.x + delta.x, y: state.offset.y + delta.y };
  return { ...state, offset: clampOffset(offset, contentSize(fit, state.scale), viewport) };
}

/** The reset the "Fit" control returns to: the whole deck, end to end. */
export function fitState(fit: Size, viewport: Size): ViewState {
  return { scale: FIT_SCALE, offset: clampOffset({ x: 0, y: 0 }, fit, viewport) };
}

/**
 * What the dialog opens on: the drawing filling the frame rather than merely fitting it.
 *
 * Fitting a 7:1 strip to the frame's WIDTH leaves most of the frame's height empty and the
 * cabin numbers no bigger than they were in the panel — which is the whole complaint about the
 * old dialog. Filling the height instead uses the space the dialog already has, and the
 * horizontal overflow it creates is the thing the agent came here to move along.
 *
 * Starts centred horizontally, because a deck plan opened at the bow tells the agent less than
 * one opened amidships. Capped at MAX_SCALE so a nearly-square drawing cannot open absurdly
 * magnified.
 */
export function fillState(fit: Size, viewport: Size): ViewState {
  if (fit.height <= 0 || fit.width <= 0) return fitState(fit, viewport);

  const scale = clampScale(viewport.height / fit.height);
  const content = contentSize(fit, scale);
  const centred = { x: (viewport.width - content.width) / 2, y: 0 };

  return { scale, offset: clampOffset(centred, content, viewport) };
}
