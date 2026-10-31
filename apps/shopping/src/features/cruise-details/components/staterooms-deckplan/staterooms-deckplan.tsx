import { Button } from '@vikings/ui/components/button';
import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { useLayoutEffect, useRef, useState } from 'react';
import type { DeckPlanConventionItem } from '@/features/cruise-details/components/staterooms-deckplan-conventions';
import { StateroomsDeckplanConventions } from '@/features/cruise-details/components/staterooms-deckplan-conventions';
import {
  cropBottomViewBox,
  cropTopViewBox,
  type ViewBox,
  withViewBox,
} from '../../lib/deck-plan-crop.ts';
import { injectPlanHighlight } from '../../lib/deck-plan-highlight.ts';

// Injects a <style> block into the raw SVG string that:
//   1. Hides all callout groups (deck-XX-callouts) by default.
//   2. Shows only the active deck's callouts.
//   3. Highlights the active deck band with a translucent blue fill.
// The SVG comes from trusted project assets, so inline rendering is safe.
function injectDeckHighlight(svgRaw: string, activeDeckLayerId: string): string {
  const style = `<style>
    [id^="deck-"][id$="-callouts"] { display: none; }
    #${activeDeckLayerId}-callouts { display: block; }
    #${activeDeckLayerId} { fill: rgba(0, 80, 151, 0.15); }
  </style>`;
  return svgRaw.replace(/(<svg[^>]*)>/, `$1>${style}`);
}

/** Room kept beside the drawn content after cropping, in drawing units (~11px at panel width). */
const CROP_MARGIN = 8;

type Crop = (viewBox: ViewBox, content: { y: number; height: number }) => string | undefined;

// Module-level so their identity is stable across renders (they are effect dependencies).
const cropFloorplan: Crop = (viewBox, content) => cropTopViewBox(viewBox, content, CROP_MARGIN);
const cropSideview: Crop = (viewBox, content) => cropBottomViewBox(viewBox, content, CROP_MARGIN);

/**
 * Crops an inline SVG's blank band (see deck-plan-crop.ts), returning the ref to put on its
 * wrapper and the viewBox to write into the markup.
 *
 * The content box only exists once the SVG is laid out, so it is measured in a layout effect —
 * ONCE per drawing (`raw`) — and then written into the markup React renders. Patching the live
 * <svg> instead did not stick (React swaps the node when a highlight arrives) and re-cropped on
 * every hover, resizing the panel under the pointer. Setting state in a layout effect
 * re-renders before paint, so the uncropped frame is never shown.
 */
function useMeasuredCrop(raw: string | undefined, crop: Crop) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{ raw: string; viewBox: string }>();
  const viewBox = measured !== undefined && measured.raw === raw ? measured.viewBox : undefined;

  useLayoutEffect(() => {
    if (raw === undefined || viewBox !== undefined) return;
    const svg = ref.current?.querySelector('svg');
    if (!svg || typeof svg.getBBox !== 'function') return;
    // Read from the attribute rather than `viewBox.baseVal`, which not every DOM implements.
    const [x = 0, y = 0, width = 0, height = 0] = (svg.getAttribute('viewBox') ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const next = crop({ x, y, width, height }, svg.getBBox());
    if (next !== undefined) setMeasured({ raw, viewBox: next });
  }, [raw, viewBox, crop]);

  return { ref, viewBox };
}

export interface StateroomsDeckplanProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Ship side-profile image shown below the deck plan (fallback when sideviewRaw is absent). */
  sideviewSrc: string;
  /** Raw SVG text of the sideview — when provided, the deck band is highlighted inline. */
  sideviewRaw?: string;
  /** SVG element id of the active deck band, e.g. 'deck-01'. Required for inline highlighting. */
  activeDeckLayerId?: string;
  /** Deck floor plan image shown at the top, above the sideview. */
  floorplanSrc: string;
  /**
   * Raw SVG text of the deck plan. When present the plan is inlined rather than served through
   * `<img>`, which is what makes its own layers addressable — the legend beside it is derived
   * from the same text, and a selected category can be picked out within it.
   */
  floorplanRaw?: string;
  /** EVO category abbreviation of the selection, e.g. 'DV3' — scopes the cabin outline to it. */
  highlightCategory?: string;
  /**
   * EVO cabin number to pick out within that category — the row the agent is pointing at or
   * has selected. Outlined only where the drawing genuinely holds that cabin in that category.
   */
  highlightCabin?: string;
  /** Convention swatches for the legend, shown directly below the floor plan. */
  conventions: DeckPlanConventionItem[];
  /** When true the component renders in its expanded state. */
  isExpanded?: boolean;
  /** Called when the expand / collapse button is clicked. */
  onExpandToggle?: () => void;
}

export function StateroomsDeckplan({
  sideviewSrc,
  sideviewRaw,
  activeDeckLayerId,
  floorplanSrc,
  floorplanRaw,
  highlightCategory,
  highlightCabin,
  conventions,
  isExpanded = false,
  onExpandToggle,
  className,
  ...divProps
}: StateroomsDeckplanProps) {
  const hasInlineSideview = sideviewRaw && sideviewRaw.length > 0 && activeDeckLayerId;
  const hasInlineFloorplan = floorplanRaw !== undefined && floorplanRaw.length > 0;
  // Both drawings carry a blank band: above the ship on the floor plan, below it on the sideview.
  const floorplanCrop = useMeasuredCrop(
    hasInlineFloorplan ? floorplanRaw : undefined,
    cropFloorplan,
  );
  const sideviewCrop = useMeasuredCrop(hasInlineSideview ? sideviewRaw : undefined, cropSideview);

  const floorplanMarkup = withViewBox(
    hasInlineFloorplan && highlightCategory !== undefined
      ? injectPlanHighlight(floorplanRaw, highlightCategory, highlightCabin)
      : (floorplanRaw ?? ''),
    floorplanCrop.viewBox,
  );

  return (
    <div
      data-slot="staterooms-deckplan"
      className={cn('flex flex-col overflow-hidden rounded-md bg-white', className)}
      {...divProps}
    >
      {hasInlineFloorplan ? (
        <div
          ref={floorplanCrop.ref}
          data-slot="deckplan-floorplan"
          role="img"
          aria-label="deck floor plan"
          className="w-full px-5 pt-8 [&_svg]:h-auto [&_svg]:w-full"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is from trusted project assets
          dangerouslySetInnerHTML={{ __html: floorplanMarkup }}
        />
      ) : (
        <img src={floorplanSrc} alt="deck floor plan" className="w-full object-contain px-5 pt-8" />
      )}

      {/* Both drawings and the legend share a 20px horizontal inset, with 32px above the floor
          plan and below the sideview, so the artwork never runs into the card edge. */}
      {/* The legend describes the deck plan, so it sits right under it, not under the sideview. */}
      <StateroomsDeckplanConventions items={conventions} className="shrink-0 px-5 pt-3 pb-8" />

      {hasInlineSideview ? (
        <div
          ref={sideviewCrop.ref}
          data-slot="deckplan-sideview"
          className="w-full px-5 pt-4 pb-8 [&_svg]:h-auto [&_svg]:w-full"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is from trusted project assets
          dangerouslySetInnerHTML={{
            __html: withViewBox(
              injectDeckHighlight(sideviewRaw, activeDeckLayerId),
              sideviewCrop.viewBox,
            ),
          }}
        />
      ) : (
        <img
          src={sideviewSrc}
          alt="ship sideview"
          className="w-full object-contain px-5 pt-4 pb-8"
        />
      )}

      <div className="flex shrink-0 justify-end px-5 pt-3 pb-5">
        <Button
          variant="secondary"
          size="icon"
          aria-label={isExpanded ? 'collapse' : 'expand'}
          onClick={onExpandToggle}
          className="shrink-0"
        >
          <Icon name="IconNavigationOpenInFull2" size={16} tone="current" />
        </Button>
      </div>
    </div>
  );
}
