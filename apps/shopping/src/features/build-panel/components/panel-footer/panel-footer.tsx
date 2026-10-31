import { Button } from '@vas/ui/components/button';
import { Icon } from '@vas/ui/components/icon';
import { cn } from '@vas/ui/lib/utils';
import { PriceCurrency } from '@/shared/components/price-currency';

/*
  PanelFooter — sticky bottom bar of the Build Panel (SApp_UX-VD, node 1619:339423).

  Eight variants map the Figma component set (APPROVED Build Panel V7, node 2148-264918):
    TA              → expanded, TA/agent mode: gross total (stacked above comm total)
    TA-collapsed    → collapsed, TA mode: BREAKDOWN toggle + gross stacked above comm
    direct          → expanded, direct customer: gross total only
    direct-collapsed → collapsed, direct: BREAKDOWN toggle + gross total
    recalculating   → collapsed, price updating: BREAKDOWN toggle + recalculating indicator; all buttons disabled
    zero            → collapsed, no price yet: BREAKDOWN toggle + $00.00
    disabled        → collapsed, no contact/TA associated: BREAKDOWN toggle + gross + info notice; all buttons disabled
    book-unavailable → collapsed, booking blocked (e.g. no cabin selected): BREAKDOWN toggle + gross; Save buttons enabled, Book Now disabled

  Code connections:
    PriceCurrency (total)         → @/shared/components/price-currency, variant="total"
    PriceCurrency (comm-total)    → @/shared/components/price-currency, variant="comm-total"
    PriceCurrency (recalculating) → @/shared/components/price-currency, variant="recalculating"
    Button (secondary)            → @vas/ui/components/button, variant="secondary"
    Button (default/primary)      → @vas/ui/components/button, variant="default"
    Spinner                       → rendered internally by PriceCurrency recalculating variant
    Icon (ExpandLess16)           → BREAKDOWN chevron-up toggle
    Icon (StatusInfo16)           → disabled-state info notice
*/

export type PanelFooterVariant =
  | 'TA'
  | 'TA-collapsed'
  | 'direct'
  | 'direct-collapsed'
  | 'recalculating'
  | 'zero'
  | 'disabled'
  | 'book-unavailable';

export interface PanelFooterProps {
  variant?: PanelFooterVariant;
  /** Pre-formatted gross total string, e.g. "$33,455.00". Not used by `recalculating`. */
  grossTotal?: string;
  /** ISO currency code, e.g. "USD". */
  currencyCode?: string;
  /** Pre-formatted commission total string, e.g. "$4,999.00". TA variants only. */
  commTotal?: string;
  /** Show the currency code beside the price. Defaults to true. */
  showCurrency?: boolean;
  /** Fired when the agent clicks "Save Opportunity". */
  onSaveOpportunity?: () => void;
  /** Fired when the agent clicks "Save Search". */
  onSaveSearch?: () => void;
  /**
   * Fired when the agent clicks the primary CTA — labelled "Review Booking" while collapsed
   * and "Book Now" once expanded. Disabled when variant is `disabled`, `recalculating`, or
   * `book-unavailable`.
   */
  onBookNow?: () => void;
  /** Fired when the agent clicks the BREAKDOWN toggle (collapsed variants only). */
  onBreakdownToggle?: () => void;
  className?: string;
}

const isCollapsedVariant = (v: PanelFooterVariant) =>
  v === 'TA-collapsed' ||
  v === 'direct-collapsed' ||
  v === 'recalculating' ||
  v === 'zero' ||
  v === 'disabled' ||
  v === 'book-unavailable';

const isTAVariant = (v: PanelFooterVariant) => v === 'TA' || v === 'TA-collapsed';

const isExpandedVariant = (v: PanelFooterVariant) => v === 'TA' || v === 'direct';

export function PanelFooter({
  variant = 'TA',
  grossTotal = '$33,455.00',
  currencyCode = 'USD',
  commTotal = '$4,999.00',
  showCurrency = true,
  onSaveOpportunity,
  onSaveSearch,
  onBookNow,
  onBreakdownToggle,
  className,
}: PanelFooterProps) {
  const collapsed = isCollapsedVariant(variant);
  const isTA = isTAVariant(variant);
  const isExpanded = isExpandedVariant(variant);

  // The primary CTA is contextual: while the panel is collapsed (the agent is still
  // configuring the cr) it reads "Review Booking", inviting them to open the breakdown;
  // once the panel is expanded and the full per-guest ledger is in view, it becomes the
  // commit action "Book Now". Same button and handler throughout — only the copy changes.
  const bookActionLabel = isExpanded ? 'Book Now' : 'Review Booking';

  // Figma Panel 02 (recalculating) and 03 (disabled): all action buttons disabled.
  const allButtonsDisabled = variant === 'disabled' || variant === 'recalculating';
  // Figma Panel 04 (book-unavailable): only Book Now disabled.
  const bookNowDisabled = allButtonsDisabled || variant === 'book-unavailable';

  return (
    <footer
      data-variant={variant}
      className={cn(
        'flex items-center gap-3 border-t border-line-selected bg-selected px-6 py-2 shadow-card',
        className,
      )}
    >
      {/* ── Left: price information ───────────────────────────────────── */}
      <div
        className={cn(
          'flex shrink-0',
          variant === 'TA'
            ? 'flex-col gap-0.5 items-start justify-center'
            : variant === 'direct'
              ? 'items-center'
              : 'items-end gap-3',
        )}
      >
        {/* BREAKDOWN toggle — collapsed variants only */}
        {collapsed && (
          <button
            type="button"
            onClick={onBreakdownToggle}
            className="flex shrink-0 items-center gap-0.5 text-overline font-semibold uppercase tracking-overline text-fjord hover:opacity-80"
            // No aria-label: an override would replace the visible "Breakdown" in the
            // accessible name (WCAG 2.5.3), leaving voice control unable to address the
            // control by the word the agent can see. `aria-expanded` carries the state the
            // old label was trying to express — and carried backwards, since this button
            // EXPANDS the panel.
            aria-expanded={false}
          >
            Breakdown
            <Icon name="IconNavigationExpandLess16" size={16} tone="brand" />
          </button>
        )}

        {/* TA-collapsed: prices stacked vertically (Figma Panel 05) */}
        {variant === 'TA-collapsed' ? (
          <div className="flex flex-col items-start gap-0.5 justify-center">
            <PriceCurrency
              variant="total"
              amount={grossTotal}
              currencyCode={currencyCode}
              showCurrency={showCurrency}
            />
            <PriceCurrency
              variant="comm-total"
              amount={commTotal}
              currencyCode={currencyCode}
              showCurrency={showCurrency}
            />
          </div>
        ) : variant === 'recalculating' ? (
          <PriceCurrency variant="recalculating" />
        ) : (
          <>
            <PriceCurrency
              variant="total"
              amount={grossTotal}
              currencyCode={currencyCode}
              showCurrency={showCurrency}
            />
            {/* Comm total: TA expanded only (TA-collapsed is handled above) */}
            {!collapsed && isTA && (
              <PriceCurrency
                variant="comm-total"
                amount={commTotal}
                currencyCode={currencyCode}
                showCurrency={showCurrency}
              />
            )}
          </>
        )}
      </div>

      {/* ── Spacer ────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1" />

      {/* ── Grand-total region (expanded TA / direct only) ────────────── */}
      {isExpanded && (
        <>
          {/* Placeholder for the grand-total breakdown bar rendered by the
              parent BuildPanel when the panel is expanded. */}
          <div className="h-7.5 w-53.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1" />
        </>
      )}

      {/* ── Right: disabled notice + action buttons ────────────────────── */}
      <div className="flex shrink-0 items-center gap-3">
        {variant === 'disabled' && (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Icon name="IconStatusInfo16" size={16} tone="current" className="text-info" />
            <span className="text-label-sm font-semibold text-info">
              Associate a Direct Contact or TA to proceed
            </span>
          </div>
        )}

        <Button variant="secondary" onClick={onSaveOpportunity} disabled={allButtonsDisabled}>
          Save Opportunity
        </Button>
        <Button variant="secondary" onClick={onSaveSearch} disabled={allButtonsDisabled}>
          Save Search
        </Button>
        <Button variant="default" onClick={onBookNow} disabled={bookNowDisabled}>
          {bookActionLabel}
        </Button>
      </div>
    </footer>
  );
}
