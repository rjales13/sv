import { AvailabilityBadge } from '@vikings/ui/components/availability-badge';
import { Spinner } from '@vikings/ui/components/spinner';
import { cn } from '@vikings/ui/lib/utils';

/*
  Viking PriceCurrency — inline price block with optional currency code.
  Six variants map the Figma PriceCurrency component set (ShoppingApp_UX-VD, node 1781:167043):
    default       → "Starting at" + 18px price + currency overline
    base          → 18px price + currency overline, no prefix
    total         → "Gross total" overline + 20px price + currency overline
    comm-total    → "Comm total" overline + 12px price + 10px currency, all secondary ink
    recalculating → "Gross total" overline + spinner + "Recalculating…" helper text
    sold          → AvailabilityBadge (Sold Out)

  `showCurrency` maps to Figma's `currency` boolean.
  Money formatting is the caller's job — pass pre-formatted strings ("$4,999.00").

  Price and currency rows use `items-baseline` rather than Figma's literal
  padding offsets: the design aligns the currency code to the price's baseline,
  and baseline alignment holds that relationship at any font size or zoom level.
*/

/** 11px semibold uppercase overline — the currency code and section eyebrows. */
const OVERLINE = 'text-overline font-semibold uppercase tracking-overline';

export type PriceCurrencyVariant =
  | 'default'
  | 'base'
  | 'total'
  | 'comm-total'
  | 'recalculating'
  | 'sold';

export interface PriceCurrencyProps {
  variant?: PriceCurrencyVariant;
  /** Pre-formatted price string, e.g. "$4,999.00". Unused by `recalculating` and `sold`. */
  amount?: string;
  /**
   * Prefix before the figure on the `default` variant. Defaults to "Starting at";
   * extension rows in CardHeader pass an availability count ("54 Available") instead.
   */
  label?: string;
  /** ISO currency code rendered as an overline beside the price, e.g. "USD". */
  currencyCode?: string;
  /** Show the currency code. Maps to Figma's `currency` boolean. Defaults to true. */
  showCurrency?: boolean;
  className?: string;
}

export function PriceCurrency({
  variant = 'default',
  amount = '$4,999.00',
  label = 'Starting at',
  currencyCode = 'USD',
  showCurrency = true,
  className,
}: PriceCurrencyProps) {
  // Figma's instance of this badge paints palette red-500; the DS AvailabilityBadge
  // uses status/error. The DS token wins — a one-off palette value here would
  // fork "sold out" red away from every other inventory badge in the app.
  if (variant === 'sold') {
    return (
      <AvailabilityBadge
        status="soldout"
        data-slot="price-currency"
        data-variant={variant}
        className={className}
      />
    );
  }

  if (variant === 'recalculating') {
    return (
      <div
        data-slot="price-currency"
        data-variant={variant}
        className={cn('flex items-center gap-2', className)}
        aria-live="polite"
        aria-busy="true"
      >
        <span className={cn(OVERLINE, 'text-fjord')}>Gross total</span>
        <div className="flex items-center gap-1">
          <Spinner className="size-4" />
          <span className="text-helper text-ink-secondary">Recalculating…</span>
        </div>
      </div>
    );
  }

  if (variant === 'comm-total') {
    return (
      <div
        data-slot="price-currency"
        data-variant={variant}
        className={cn('flex items-baseline gap-2', className)}
      >
        <span className="text-overline font-normal uppercase tracking-overline text-ink-secondary">
          Comm total
        </span>
        <div className="flex items-baseline gap-1">
          <span
            data-slot="price-currency-amount"
            className="text-label-sm font-semibold text-ink-secondary"
          >
            {amount}
          </span>
          {showCurrency && <span className="text-helper text-ink-secondary">{currencyCode}</span>}
        </div>
      </div>
    );
  }

  if (variant === 'total') {
    return (
      <div
        data-slot="price-currency"
        data-variant={variant}
        className={cn('flex items-baseline gap-2', className)}
      >
        <span className={cn(OVERLINE, 'text-fjord')}>Gross total</span>
        <div className="flex items-baseline gap-1">
          <span data-slot="price-currency-amount" className="text-h3 font-bold text-fjord">
            {amount}
          </span>
          {showCurrency && <span className={cn(OVERLINE, 'text-fjord')}>{currencyCode}</span>}
        </div>
      </div>
    );
  }

  if (variant === 'base') {
    return (
      <div
        data-slot="price-currency"
        data-variant={variant}
        className={cn('flex items-baseline gap-1', className)}
      >
        <span data-slot="price-currency-amount" className="text-h4 font-bold text-fjord">
          {amount}
        </span>
        {showCurrency && <span className={cn(OVERLINE, 'text-fjord')}>{currencyCode}</span>}
      </div>
    );
  }

  return (
    <div
      data-slot="price-currency"
      data-variant={variant}
      className={cn('flex items-baseline gap-2', className)}
    >
      <span className="text-body-md text-fjord">{label}</span>
      <div className="flex items-baseline gap-1">
        <span data-slot="price-currency-amount" className="text-h4 font-bold text-fjord">
          {amount}
        </span>
        {showCurrency && <span className={cn(OVERLINE, 'text-fjord')}>{currencyCode}</span>}
      </div>
    </div>
  );
}
