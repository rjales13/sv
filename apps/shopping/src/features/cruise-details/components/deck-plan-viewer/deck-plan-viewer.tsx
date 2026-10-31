import { Button } from '@vikings/ui/components/button';
import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  FIT_SCALE,
  fillState,
  fitState,
  MAX_SCALE,
  type Point,
  panBy,
  type Size,
  type ViewState,
  ZOOM_STEP,
  zoomTo,
} from './zoom-pan.ts';

/*
  DeckPlanViewer — the deck plan at a size worth opening a dialog for (VCX-10332 R4.6).

  The problem this solves is a shape problem. Deck plans are strips: 3.4:1 on the ocean ships,
  7.4:1 on the Polaris. Fitted to the width of any dialog we can reasonably show, a cabin
  number renders at a fraction of its drawn size — and the expand dialog was capped narrower
  than the panel behind it, so "expand" actually shrank the drawing by a quarter.

  Making the dialog bigger cannot fix that on its own; a 7:1 strip will always be tiny at full
  width. So the dialog holds the whole deck at rest and lets the agent magnify and move around
  it, which is how every other plan-reading tool works.

  Interactions, all doing the same thing so nobody has to learn ours:
    · drag, or wheel / trackpad          pan
    · ⌘ or Ctrl + wheel, or pinch        zoom about the pointer
    · double-click                       zoom in about the pointer
    · + / − / 0, arrow keys              zoom and pan from the keyboard
    · the toolbar                        the same, visibly

  The arithmetic lives in zoom-pan.ts, so what is left here is wiring.
*/

export interface DeckPlanViewerProps {
  /** Inlined SVG markup for the deck plan, already carrying any category/cabin highlight. */
  svgMarkup?: string | undefined;
  /** Bitmap fallback for when the raw drawing is unavailable. */
  fallbackSrc?: string;
  /** Names the drawing for assistive technology, e.g. "Viking Vesta – Deck 3 plan". */
  label: string;
  className?: string;
}

/** Keyboard pan distance per arrow press, in viewport pixels. */
const ARROW_STEP = 60;

export function DeckPlanViewer({ svgMarkup, fallbackSrc, label, className }: DeckPlanViewerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [fit, setFit] = useState<Size>({ width: 0, height: 0 });
  const [view, setView] = useState<ViewState>({ scale: FIT_SCALE, offset: { x: 0, y: 0 } });
  const [dragging, setDragging] = useState(false);

  // Measure the frame and the drawing's fit size. The drawing is laid out at width:100% with
  // its own aspect ratio, so its untransformed box IS the fit size.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (frame === null || content === null) return;

    const measure = () => {
      const frameBox = { width: frame.clientWidth, height: frame.clientHeight };
      const svg = content.querySelector('svg') ?? content.querySelector('img');
      const ratio =
        svg instanceof SVGSVGElement && svg.viewBox.baseVal.width > 0
          ? svg.viewBox.baseVal.height / svg.viewBox.baseVal.width
          : content.clientHeight / Math.max(1, content.clientWidth);

      const fitSize = { width: frameBox.width, height: frameBox.width * ratio };
      setViewport(frameBox);
      setFit(fitSize);
      setView(fillState(fitSize, frameBox));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const centre = useCallback(
    (): Point => ({ x: viewport.width / 2, y: viewport.height / 2 }),
    [viewport],
  );

  const pointerIn = useCallback((event: { clientX: number; clientY: number }): Point => {
    const box = frameRef.current?.getBoundingClientRect();
    if (box === undefined) return { x: 0, y: 0 };
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }, []);

  const zoomBy = useCallback(
    (factor: number, pivot: Point) => {
      setView((current) => zoomTo(current, current.scale * factor, pivot, fit, viewport));
    },
    [fit, viewport],
  );

  const reset = useCallback(() => setView(fitState(fit, viewport)), [fit, viewport]);

  // Non-passive so ⌘+wheel can be prevented from zooming the whole page. React's onWheel is
  // registered passively, so this has to be a manual listener.
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, pointerIn(event));
        return;
      }
      setView((current) => panBy(current, { x: -event.deltaX, y: -event.deltaY }, fit, viewport));
    };

    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [fit, viewport, zoomBy, pointerIn]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setView((current) => panBy(current, { x: event.movementX, y: event.movementY }, fit, viewport));
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const pans: Record<string, Point> = {
      ArrowLeft: { x: ARROW_STEP, y: 0 },
      ArrowRight: { x: -ARROW_STEP, y: 0 },
      ArrowUp: { x: 0, y: ARROW_STEP },
      ArrowDown: { x: 0, y: -ARROW_STEP },
    };
    const pan = pans[event.key];
    if (pan !== undefined) {
      event.preventDefault();
      setView((current) => panBy(current, pan, fit, viewport));
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(ZOOM_STEP, centre());
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomBy(1 / ZOOM_STEP, centre());
    } else if (event.key === '0') {
      event.preventDefault();
      reset();
    }
  };

  const atFit = view.scale <= FIT_SCALE;
  const atMax = view.scale >= MAX_SCALE;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
      <div
        ref={frameRef}
        data-slot="deck-plan-viewport"
        role="application"
        aria-label={`${label}. Drag to pan, plus and minus to zoom, zero to fit.`}
        aria-roledescription="zoomable deck plan"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: role="application" is a keyboard widget (+/-/0 zoom via onKeyDown); without tabIndex keyboard users cannot reach it.
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onDoubleClick={(event) => zoomBy(ZOOM_STEP * ZOOM_STEP, pointerIn(event))}
        onKeyDown={onKeyDown}
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden rounded-sm border border-line bg-surface-subtle',
          'outline-none focus-visible:ring-2 focus-visible:ring-fjord',
          atFit ? 'cursor-default' : dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <div
          ref={contentRef}
          data-slot="deck-plan-content"
          style={{
            transform: `translate(${view.offset.x}px, ${view.offset.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            // The drawing is wider than tall; letting it size to the frame's width is what makes
            // scale 1 mean "the whole deck".
            width: '100%',
          }}
          className="absolute top-0 left-0 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        >
          {svgMarkup === undefined || svgMarkup.length === 0 ? (
            <img src={fallbackSrc} alt={label} className="block w-full" draggable={false} />
          ) : (
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is from trusted project assets
            <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={atFit}
          onClick={() => zoomBy(1 / ZOOM_STEP, centre())}
        >
          <Icon name="IconActionMinus16" size={16} tone="current" />
        </Button>
        <span
          data-slot="deck-plan-zoom"
          aria-live="polite"
          className="w-14 text-center text-label-sm font-semibold tabular-nums text-ink-secondary"
        >
          {Math.round(view.scale * 100)}%
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={atMax}
          onClick={() => zoomBy(ZOOM_STEP, centre())}
        >
          <Icon name="IconActionAdd16" size={16} tone="current" />
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={atFit}>
          Fit
        </Button>
        <span className="ml-auto text-helper text-ink-tertiary">
          Drag to move · ⌘/Ctrl + scroll to zoom
        </span>
      </div>
    </div>
  );
}
