/*
  The delivered deck plans reserve a wide blank band above the ship — on the OVS drawings 82 of
  the 250 viewBox units, ~119px at panel width — which reads as a large top margin once the plan
  sits at the top of the panel. Cropping the viewBox to the drawn content fixes every deck and
  ship at once, where a per-file number would drift with the next asset drop.

  The floor plan is cropped at the top only; the space below the ship separates it from the
  sideview. The sideview has the opposite problem — its labels sit at the top, and the HID
  drawing leaves its lower half blank (~240px at panel width) — so it is cropped at the bottom.
*/

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The viewBox with the blank band above the drawn content removed, `margin` units kept.
 * `undefined` when either box is unmeasured (e.g. before layout), so callers leave it alone.
 */
export function cropTopViewBox(
  viewBox: ViewBox,
  content: { y: number; height: number },
  margin: number,
): string | undefined {
  if (viewBox.height <= 0 || content.height <= 0) return undefined;
  const top = Math.max(viewBox.y, content.y - margin);
  const bottom = viewBox.y + viewBox.height;
  return `${viewBox.x} ${top} ${viewBox.width} ${bottom - top}`;
}

/**
 * The viewBox with the blank band below the drawn content removed, `margin` units kept.
 * `undefined` when either box is unmeasured (e.g. before layout), so callers leave it alone.
 */
export function cropBottomViewBox(
  viewBox: ViewBox,
  content: { y: number; height: number },
  margin: number,
): string | undefined {
  if (viewBox.height <= 0 || content.height <= 0) return undefined;
  const bottom = Math.min(viewBox.y + viewBox.height, content.y + content.height + margin);
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${bottom - viewBox.y}`;
}

/**
 * The markup with its ROOT `<svg>` viewBox replaced — applied to the string React renders, so
 * the crop survives every re-render instead of being patched into a DOM node React may swap.
 */
export function withViewBox(svgMarkup: string, viewBox: string | undefined): string {
  if (viewBox === undefined) return svgMarkup;
  return svgMarkup.replace(/<svg\b[^>]*>/, (root) =>
    root.replace(/\bviewBox="[^"]*"/, `viewBox="${viewBox}"`),
  );
}
