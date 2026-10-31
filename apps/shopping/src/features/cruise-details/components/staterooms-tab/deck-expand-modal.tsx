import { Button } from '@vikings/ui/components/button';
import { Dialog, DialogClose, DialogContent } from '@vikings/ui/components/dialog';
import { Icon } from '@vikings/ui/components/icon';
import { DeckPlanViewer } from '../deck-plan-viewer/deck-plan-viewer.tsx';
import type { DeckPlanConventionItem } from '../staterooms-deckplan-conventions/index.ts';
import { StateroomsDeckplanConventions } from '../staterooms-deckplan-conventions/index.ts';

// DeckExpandModal — the deck plan at working size, opened by the expand button (R4.6).
//
// The layout gives its height to the ONE thing the agent opened it for. Deck plans are strips
// — 3.4:1 on the ocean ships, 7.4:1 on the Polaris — so fitted to width they use a fraction of
// a dialog's height and leave the rest empty. Here the plan takes all the space left over and
// can be magnified within it, while the two things that orient the agent stay put:
//
//   · the sideview is a locator, not detail, so it stays a fixed strip at the top
//   · the legend is the key to the colours, so it is pinned rather than scrolled away
//
// The dialog itself is wider than it was. It was capped at 960px against a ~1250px panel, so
// "expand" made the drawing 26% SMALLER than the one behind it — the opposite of the control's
// promise. It is still bounded well inside the viewport; the zoom, not the dialog, is what
// makes the detail readable.
//
// Dismissing must not affect any selection state — the parent owns all of it (R4.6).

export interface DeckExpandModalProps {
  open: boolean;
  onClose: () => void;
  shipName: string;
  deckLabel: string;
  sideviewSrc: string;
  floorplanSrc: string;
  /** Inlined plan markup, carrying the category dim and the selected cabin's outline. */
  floorplanRaw?: string | undefined;
  conventions: DeckPlanConventionItem[];
}

export function DeckExpandModal({
  open,
  onClose,
  shipName,
  deckLabel,
  sideviewSrc,
  floorplanSrc,
  floorplanRaw,
  conventions,
}: DeckExpandModalProps) {
  const title = deckLabel ? `${shipName} – ${deckLabel}` : shipName;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[88vh] max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1320px,calc(100vw-4rem))]"
      >
        <div className="flex shrink-0 items-center gap-3 px-6 py-4">
          <span className="flex-1 text-label-md font-semibold text-ink">{title}</span>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close deck plan">
              <Icon name="IconNavigationClose" size={24} tone="current" />
            </Button>
          </DialogClose>
        </div>
        <div className="h-px shrink-0 bg-line" aria-hidden="true" />

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
          {/* Orientation only — where this deck sits in the ship. Capped so it cannot crowd
              out the plan on a short window. */}
          <img
            src={sideviewSrc}
            alt="Ship sideview"
            className="max-h-24 w-full shrink-0 object-contain"
          />

          <DeckPlanViewer
            {...(floorplanRaw !== undefined && { svgMarkup: floorplanRaw })}
            fallbackSrc={floorplanSrc}
            label={`${title} deck plan`}
          />

          <StateroomsDeckplanConventions items={conventions} className="shrink-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
