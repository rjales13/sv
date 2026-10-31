import { Icon } from '@vikings/ui/components/icon';
import { Spinner } from '@vikings/ui/components/spinner';
import { cn } from '@vikings/ui/lib/utils';
import { useId } from 'react';
import { PriceLineItem } from '@/shared/components/price-line-item';

/*
  VikingAirSummary — the "Airfare Summary" panel of the Viking Air tab
  (ShoppingApp_UX-VD, node 1519:276836, Figma property "Property 1").

    empty      — no gateway/class chosen yet → icon-badge + prompt
    loading    — airfare being priced → Spinner + "Calculating Airfare"
    no-air     — guest declined Viking Air → icon-badge + notice (shorter panel)
    summarized — airfare, discount and per-guest total as PriceLineItem rows

  Code connections used:
    Icon                   (3292:232843, 3292:232925) IconTravelFlightTakeoff16 in the icon-badge
    Icon                   (1680:83109)               IconTravelFlight16 in the itinerary bullet
    Spinner                (3292:210377)              size-8
    PriceLineItem (1680:83113 list, 1680:83114 discount, 1680:83129 total)

  The icon-badge glyph renders at 24px, not the snippet's size={16}: the instance
  is scaled to 24×24 inside the 78px badge in Figma, matching the staterooms-table
  icon-badge.
*/

export type VikingAirSummaryVariant = 'empty' | 'loading' | 'no-air' | 'summarized';

export interface VikingAirSummaryProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Panel state. Defaults to "empty". */
  variant?: VikingAirSummaryVariant;
  /** Pre-formatted return airfare, e.g. "$9,595.00". Shown when summarized. */
  airfare?: string;
  /** Pre-formatted Viking Air discount, e.g. "$700.00". Shown when summarized. */
  discount?: string;
  /** Pre-formatted per-guest airfare total, e.g. "$8,895.00". Shown when summarized. */
  total?: string;
}

const ROOT_CLASSES: Record<VikingAirSummaryVariant, string> = {
  empty: 'h-[288px] items-center gap-[58px] p-5',
  loading: 'h-[288px] items-center gap-[58px] p-5',
  'no-air': 'h-[196px] items-center gap-4 p-5',
  summarized: 'h-[288px] items-end gap-[18px] px-5 py-8',
};

export function VikingAirSummary({
  variant = 'empty',
  airfare,
  discount,
  total,
  className,
  ...sectionProps
}: VikingAirSummaryProps) {
  const titleId = useId();

  return (
    <section
      data-slot="viking-air-summary"
      aria-labelledby={titleId}
      aria-busy={variant === 'loading' || undefined}
      className={cn(
        'flex w-[492px] flex-col overflow-hidden rounded-sm border border-line bg-surface',
        ROOT_CLASSES[variant],
        className,
      )}
      {...sectionProps}
    >
      <p id={titleId} className="w-full truncate text-title-md font-semibold text-fjord">
        Airfare Summary
      </p>
      {variant === 'empty' && (
        <EmptyMessage message="Select Gateways and Airfare Class" wide={false} />
      )}
      {variant === 'no-air' && <EmptyMessage message="Viking Air is not included" wide />}
      {variant === 'loading' && <Calculating />}
      {variant === 'summarized' && <Summary airfare={airfare} discount={discount} total={total} />}
    </section>
  );
}

function IconBadge() {
  return (
    <span
      data-slot="icon-badge"
      className="flex size-[78px] shrink-0 items-center justify-center rounded-full bg-surface-muted"
    >
      <Icon name="IconTravelFlightTakeoff16" size={24} tone="muted" aria-hidden />
    </span>
  );
}

function EmptyMessage({ message, wide }: { message: string; wide: boolean }) {
  return (
    <div className="flex w-[313px] flex-col items-center gap-4">
      <IconBadge />
      <p
        className={cn(
          'text-center text-title-lg font-semibold text-fjord',
          wide ? 'w-full' : 'w-[262px]',
        )}
      >
        {message}
      </p>
    </div>
  );
}

function Calculating() {
  return (
    <div className="flex w-[313px] flex-col items-center pt-4">
      <div className="flex w-full flex-col items-center gap-[15px]">
        <Spinner className="size-8" />
        <p className="w-full text-center text-title-md font-semibold text-ink-disabled">
          Calculating Airfare
        </p>
      </div>
    </div>
  );
}

function Summary({
  airfare,
  discount,
  total,
}: {
  airfare: string | undefined;
  discount: string | undefined;
  total: string | undefined;
}) {
  return (
    <>
      <div className="flex w-full items-start gap-2">
        <div className="flex flex-col justify-center py-1.5">
          <span
            data-slot="itinerary-bullet"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-inverse text-ink-on-brand"
          >
            <Icon name="IconTravelFlight16" size={16} tone="current" aria-hidden />
          </span>
        </div>
        <div className="flex w-[422px] shrink-0 flex-col">
          <PriceLineItem variant="list" label="Origin - Return Airfare" amount={airfare} />
          <PriceLineItem variant="discount" label="Viking Air Discounts" amount={discount} />
        </div>
      </div>
      <PriceLineItem variant="total" label="Airfare Total" amount={total} />
    </>
  );
}
