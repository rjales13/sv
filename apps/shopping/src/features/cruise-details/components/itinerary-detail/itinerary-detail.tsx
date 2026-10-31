import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@vikings/ui/components/accordion';
import { Badge } from '@vikings/ui/components/badge';
import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { type ItineraryVariant, VARIANT_ICON } from '@/shared/components/itinerary-row';

/*
  ItineraryDetail — one expandable day of a cruise itinerary (ShoppingApp_UX-VD,
  node 906:118908).

  Figma ships five flat variants (Expanded, Collapsed, Single day,
  singleday-expanded, Variant4). They are not five states: they are three
  independent axes crossed with each other.

    open?          tint + navy bullet + overview + chevron up
    day stamp?     absent on "Variant4", a continuation row for a stop that
                   shares the day above it — the bullet gutter stays, so the
                   body keeps aligning with its siblings
    range?         a closing stamp after a rule, absent on the single-day pair

  Folding those back into one `variant` enum would make the illegal states
  representable and force a sixth variant for every new combination. Same
  decomposition the sibling slices already use: card-header turns 11 flat
  variants into props, category-column reads "3/4/5/6 columns" as array length.

  This is an AccordionItem, so it REQUIRES an `Accordion` parent that owns the
  open state — the same shape as TabsBar needing a `Tabs` root. A day in an
  itinerary is never alone, and the group root is what lets Up/Down step between
  day headers and Home/End reach the ends of a long sailing. Tab still visits
  every header; the arrow keys are an extra path, not a replacement.

  The whole day-stamp row is the trigger rather than just the chevron, which is
  the hit target the Figma row already draws.
*/

/** A day marker in the itinerary — the ordinal and the calendar stamp beside it. */
export interface ItineraryDetailDay {
  /** Day ordinal, e.g. "DAY 1". */
  ordinal: string;
  /** Calendar stamp, e.g. "01 JUL (MON)". */
  date: string;
}

export interface ItineraryDetailProps {
  /** Identity within the parent Accordion. Ports repeat, so it cannot be derived. */
  value: string;
  /** Opening day marker. Omit for a continuation row that shares the day above it. */
  day?: ItineraryDetailDay;
  /** Closing marker of a multi-day stop. Ignored without `day` — it has no anchor. */
  through?: ItineraryDetailDay;
  /** Port headline, e.g. "Paris, France (PAR)". */
  port: string;
  /** Stop kind — picks the glyph on the detail line. */
  variant: ItineraryVariant;
  /** Detail line label, e.g. "Paris Hotel". */
  label: string;
  /** Neutral badges on the detail line, e.g. ["Board 3:00 PM", "Overnight"]. */
  tags?: string[];
  /** Teaser copy. Always visible, open or closed. */
  summary: string;
  /** Long-form copy revealed on open. Omit to make the row non-expandable. */
  overview?: string;
  className?: string;
}

/** 11px uppercase overline in tertiary ink — the shared day/date treatment. */
const STAMP = 'text-overline uppercase tracking-overline text-ink-tertiary';

export function ItineraryDetail({
  value,
  day,
  through,
  port,
  variant,
  label,
  tags = [],
  summary,
  overview,
  className,
}: ItineraryDetailProps) {
  // Only an opening stamp gives the trigger somewhere to live, so a row without
  // one cannot offer the affordance even when it carries overview copy.
  const isExpandable = Boolean(overview && day);

  return (
    <AccordionItem
      value={value}
      data-slot="itinerary-detail"
      className={cn(
        // Only the vertical padding changes between states; keeping the axis
        // utilities separate avoids a p-4/px-4 merge race in the closed state.
        'group flex w-full items-start gap-3 overflow-clip rounded-sm px-4 py-2',
        'data-[state=open]:bg-surface-tint data-[state=open]:py-4',
        className,
      )}
    >
      {/* Bullet gutter. A continuation row hides the mark but keeps the column,
          so every body in the list shares one left edge. */}
      <div
        data-slot="itinerary-detail-bullet"
        className={cn('flex h-5 w-4 shrink-0 items-center justify-center', !day && 'opacity-0')}
      >
        <span
          aria-hidden="true"
          className="size-4 shrink-0 rounded-full bg-slate group-data-[state=open]:bg-surface-inverse"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start group-data-[state=open]:gap-3">
        <div className="flex w-full flex-col items-start gap-1">
          {day && (
            // h-5 pins the row to the design's 20px while the 24px chevron
            // overflows it, exactly as the Figma row is drawn.
            <div className="flex h-5 w-full items-center">
              {isExpandable ? (
                <AccordionTrigger>
                  <DayRange day={day} through={through} />
                  {/* The visible label is only a date, so name the stop too —
                      out of flow, so it cannot disturb the row's layout. */}
                  <span className="sr-only">{port}</span>
                </AccordionTrigger>
              ) : (
                <DayRange day={day} through={through} />
              )}
            </div>
          )}

          <div className="flex h-5 w-full items-center">
            <span className="truncate text-title-lg font-semibold text-fjord">{port}</span>
          </div>

          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name={VARIANT_ICON[variant]} size={24} />
              <span className="truncate text-label-lg font-semibold text-fjord">{label}</span>
            </div>

            {tags.length > 0 && (
              <div className="flex shrink-0 items-center justify-end gap-2">
                {tags.map((tag) => (
                  // Code Connect maps these to Badge/neutral, but this design
                  // paints them surface/default on a border/default hairline
                  // rather than the variant's solid grey. The variant axis has no
                  // outline option, so the connected component stands and the two
                  // tokens the design names are applied on top.
                  <Badge key={tag} variant="neutral" className="border border-line bg-surface">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className="w-full text-body-sm text-ink">{summary}</p>
        </div>

        {overview && (
          <AccordionContent className="w-full">
            <p className="text-body-sm text-ink">{overview}</p>
          </AccordionContent>
        )}
      </div>
    </AccordionItem>
  );
}

/** The day stamp, optionally spanning to a closing stamp after a hairline rule. */
function DayRange({
  day,
  through,
}: {
  day: ItineraryDetailDay;
  // Explicitly `| undefined` rather than optional: exactOptionalPropertyTypes
  // rejects forwarding a possibly-undefined value into an optional prop.
  through: ItineraryDetailDay | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <DayStamp {...day} />
      {through && (
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-3 shrink-0 bg-ink" />
          {/* The rule alone carries the span, so name it for assistive tech. */}
          <span className="sr-only">through</span>
          <DayStamp {...through} />
        </div>
      )}
    </div>
  );
}

/** Day ordinal · calendar stamp. The ordinal is bold, the date semibold — as drawn. */
function DayStamp({ ordinal, date }: ItineraryDetailDay) {
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <span className={cn(STAMP, 'font-bold')}>{ordinal}</span>
      <span aria-hidden="true" className="text-label-sm font-semibold text-ink">
        ·
      </span>
      <span className={cn(STAMP, 'font-semibold')}>{date}</span>
    </div>
  );
}
