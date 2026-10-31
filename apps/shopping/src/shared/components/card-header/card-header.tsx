import { Badge } from '@vas/ui/components/badge';
import { cn } from '@vas/ui/lib/utils';
import { PriceCurrency } from '../price-currency/index.ts';

/*
  CardHeader — the selected-blue row that tops a cr or extension result
  (SApp_UX-VD, node 748:48042).

  Figma models this as 11 variants, but they are three orthogonal concerns:
    • category   — the coloured chip (product line for crs, position for extensions)
    • ship/code  — present on cr rows only, each behind a hairline divider
    • price      — "Starting at"/"54 Available" + figure, the figure alone, or SOLD OUT

  Expressing those as props rather than 11 variant names keeps the caller honest:
  a cr row passes ship + voyageCode, an extension row does not.
*/

export type CardHeaderCategory =
  | 'oceans'
  | 'rivers'
  | 'expeditions'
  | 'mississippi'
  | 'pre'
  | 'pre-stopover'
  | 'post'
  | 'post-stopover'
  | 'land-package';

/*
  Category chip label + fill. These are product-line brand marks, not statuses, so
  they are mapped here rather than added to the DS Badge's semantic variant set —
  `variant="success"` meaning "Mississippi" would break the moment the success
  token moves. The DS Badge still supplies the pill geometry and type ramp.

  Two fills have no exact DS token: Figma paints Mississippi/POST with
  palette/success-600 (#037d6a) and there is no such token, so `bg-success`
  (#005e4c) stands in. Flagged for design to reconcile.
*/
export const CATEGORY_MARK: Record<CardHeaderCategory, { label: string; fill: string }> = {
  oceans: { label: 'Oceans', fill: 'bg-fjord text-ink-on-brand' },
  rivers: { label: 'Rivers', fill: 'bg-VA-red text-ink-on-brand' },
  expeditions: { label: 'Expeditions', fill: 'bg-ink-tertiary text-ink-on-brand' },
  mississippi: { label: 'Mississippi', fill: 'bg-success text-ink-on-brand' },
  pre: { label: 'PRE', fill: 'bg-info text-ink-on-brand' },
  'pre-stopover': { label: 'PRE STOPOVER', fill: 'bg-info text-ink-on-brand' },
  post: { label: 'POST', fill: 'bg-success text-ink-on-brand' },
  'post-stopover': { label: 'POST STOPOVER', fill: 'bg-success text-ink-on-brand' },
  'land-package': { label: 'INCLUDED LAND PACKAGE', fill: 'bg-surface text-fjord' },
};

/** 11px semibold uppercase overline in tertiary ink — the meta strip. */
const META = 'text-overline font-semibold uppercase tracking-overline text-ink-tertiary';

export interface CardHeaderProps {
  /** Product line (cr) or position (extension) — sets the chip label and fill. */
  category: CardHeaderCategory;
  title: string;
  /** Leading meta item: fare currency ("EUR") on crs, duration ("4 Nights") on extensions. */
  meta: string;
  /** Ship name. cr rows only — renders after a hairline divider. */
  ship?: string;
  /** Voyage code. cr rows only — renders after a hairline divider. */
  voyageCode?: string;
  /** Replaces the whole price block with a SOLD OUT badge. */
  soldOut?: boolean;
  /**
   * Land-package included state: subtle background (matches card body), no blue
   * header bar, and "Included" bold text instead of a price widget.
   */
  included?: boolean;
  /** Prefix before the figure, e.g. "Starting at" or "54 Available". Omit to show the figure alone. */
  priceLabel?: string;
  /** Pre-formatted price, e.g. "$4,999.00". Formatting is the caller's job. */
  amount?: string;
  currencyCode?: string;
  className?: string;
}

export function CardHeader({
  category,
  title,
  meta,
  ship,
  voyageCode,
  soldOut = false,
  included = false,
  priceLabel,
  amount = '$4,999.00',
  currencyCode = 'USD',
  className,
}: CardHeaderProps) {
  const { label, fill } = CATEGORY_MARK[category];

  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex h-12 w-full items-center justify-between gap-4 border-b px-4 py-3',
        included ? 'border-line bg-surface-subtle' : 'border-line-selected bg-selected',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Badge className={cn('shrink-0', fill)}>{label}</Badge>
        <span
          data-slot="card-header-title"
          className="truncate text-title-lg font-semibold text-fjord"
        >
          {title}
        </span>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className={META}>{meta}</span>
          {ship && (
            <>
              <Divider />
              <span className={META}>{ship}</span>
            </>
          )}
          {voyageCode && (
            <>
              <Divider />
              <span className={META}>{voyageCode}</span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {included ? (
          <span className="text-title-lg font-bold text-fjord">Included</span>
        ) : soldOut ? (
          <PriceCurrency variant="sold" />
        ) : (
          <PriceCurrency
            variant={priceLabel ? 'default' : 'base'}
            amount={amount}
            currencyCode={currencyCode}
            {...(priceLabel ? { label: priceLabel } : {})}
          />
        )}
      </div>
    </div>
  );
}

/** 1x14px hairline between meta items. Decorative — hidden from assistive tech. */
function Divider() {
  return <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-line-selected" />;
}
