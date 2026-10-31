import { cn } from '@vikings/ui/lib/utils';

/*
  PriceLineItem — label + price row for fare breakdowns (e.g. the Viking Air panel)
  (ShoppingApp_UX-VD, node 1515:276009).

  12 variants across two display modes:

  Standard (w-[422px]):
    list        — label + amount (regular body)
    list-na     — disabled label + "Not eligible"
    discount    — "– label" + red "– amount"
    subtotal    — semibold label + semibold amount (14px) + top border (strong)
    total       — semibold label + semibold amount (16px) + Per Guest + top border (2px)
    grand-total — "Grand Total" label + bold amount (20px/fjord) + Per Guest + top border (2px)

  Commission (w-[600px]) — adds FARE | COMM% | COMMISSION price columns:
    comm-header    — column header row (FARE / COMM % / COMMISSION)
    comm-list      — label + 3 price columns (body)
    comm-list-na   — disabled label + "Not eligible" | — | —
    comm-discount  — "– label" + red fare | — | —
    comm-subtotal  — semibold label + semibold 3 columns + top border
    comm-total     — large semibold label + large 3 columns + top border
*/

export type PriceLineItemVariant =
  | 'list'
  | 'list-na'
  | 'discount'
  | 'subtotal'
  | 'total'
  | 'grand-total'
  | 'comm-header'
  | 'comm-list'
  | 'comm-list-na'
  | 'comm-discount'
  | 'comm-subtotal'
  | 'comm-total';

export interface PriceLineItemProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Display variant — controls layout, border, and type scale. Defaults to "list". */
  variant?: PriceLineItemVariant;
  /** Line item description, e.g. "Originating Gateway Air Add On". */
  label?: string | undefined;
  /** Pre-formatted price string, e.g. "$1,000.00". Used for standard variants. */
  amount?: string | undefined;
  /** Pre-formatted fare amount for commission variants, e.g. "$10,000.00". */
  fare?: string | undefined;
  /** Commission percentage string, e.g. "20%". Used for comm-list, comm-subtotal, comm-total. */
  commPercent?: string | undefined;
  /** Pre-formatted commission amount, e.g. "$100,000.00". */
  commission?: string | undefined;
  /** Show the "Per Guest" helper under total / grand-total amounts (Figma Price-Item "Helper"). Defaults to true. */
  showPerGuest?: boolean;
}

// --- Root border/width classes by variant ---
const ROOT_CLASSES: Record<PriceLineItemVariant, string> = {
  list: 'px-1 py-2 w-[422px]',
  'list-na': 'px-1 py-2 w-[422px]',
  discount: 'px-1 py-2 w-[422px]',
  subtotal: 'border-t border-line-strong px-1 py-2 w-[422px]',
  total: 'border-t-2 border-ink px-1 py-2 w-[422px]',
  'grand-total': 'border-t-2 border-ink px-1 py-2 w-[422px]',
  'comm-header': 'p-1 w-[600px]',
  'comm-list': 'px-1 py-2 w-[600px]',
  'comm-list-na': 'px-1 py-2 w-[600px]',
  'comm-discount': 'px-1 py-2 w-[600px]',
  'comm-subtotal': 'border-t border-line px-1 py-2 w-[600px]',
  'comm-total': 'border-t border-line px-1 py-2 w-[600px]',
};

/** "Per Guest" helper text below a stacked amount. */
function PerGuest() {
  return <span className="block text-right text-helper text-ink-secondary">Per Guest</span>;
}

export function PriceLineItem({
  variant = 'list',
  label,
  amount,
  fare,
  commPercent,
  commission,
  showPerGuest = true,
  className,
  ...divProps
}: PriceLineItemProps) {
  const isCommVariant = variant.startsWith('comm-');

  return (
    <div
      data-slot="price-line-item"
      className={cn(
        'flex items-center justify-between overflow-hidden',
        ROOT_CLASSES[variant],
        className,
      )}
      {...divProps}
    >
      <LabelCell variant={variant} label={label} />
      {isCommVariant ? (
        <CommPriceSection
          variant={variant as CommVariant}
          fare={fare}
          commPercent={commPercent}
          commission={commission}
        />
      ) : (
        <StandardAmountCell
          variant={variant as StandardVariant}
          amount={amount}
          showPerGuest={showPerGuest}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standard amount cell (non-commission variants)
// ---------------------------------------------------------------------------

type StandardVariant = 'list' | 'list-na' | 'discount' | 'subtotal' | 'total' | 'grand-total';

function StandardAmountCell({
  variant,
  amount,
  showPerGuest,
}: {
  variant: StandardVariant;
  amount: string | undefined;
  showPerGuest: boolean;
}) {
  if (variant === 'list') {
    return <span className="text-body-sm text-ink">{amount}</span>;
  }
  if (variant === 'list-na') {
    return <span className="text-label-md font-semibold text-ink-disabled">Not eligible</span>;
  }
  if (variant === 'discount') {
    return (
      <span className="text-body-sm text-viking-red">
        {amount !== undefined ? `– ${amount}` : ''}
      </span>
    );
  }
  if (variant === 'subtotal') {
    return <span className="text-label-lg font-semibold text-ink">{amount}</span>;
  }
  if (variant === 'total') {
    return (
      <span className="flex flex-col items-end gap-0.5">
        <span className="text-title-lg font-semibold text-ink">{amount}</span>
        {showPerGuest && <PerGuest />}
      </span>
    );
  }
  // grand-total
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="text-h3 font-bold text-fjord">{amount}</span>
      {showPerGuest && <PerGuest />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Label cell
// ---------------------------------------------------------------------------

function LabelCell({
  variant,
  label,
}: {
  variant: PriceLineItemVariant;
  label: string | undefined;
}) {
  if (variant === 'grand-total') {
    return <span className="text-label-lg font-semibold text-ink">Grand Total</span>;
  }
  if (variant === 'comm-header') {
    // Invisible spacer that keeps the right-side columns aligned
    return <span className="text-body-sm opacity-0 select-none">{label}</span>;
  }
  if (variant === 'discount' || variant === 'comm-discount') {
    return <span className="text-body-sm text-ink whitespace-nowrap">{`– ${label ?? ''}`}</span>;
  }
  if (variant === 'list-na' || variant === 'comm-list-na') {
    return <span className="text-body-sm text-ink-disabled">{label}</span>;
  }
  if (variant === 'subtotal' || variant === 'comm-subtotal') {
    return <span className="text-label-md font-semibold text-ink">{label}</span>;
  }
  if (variant === 'total' || variant === 'comm-total') {
    return <span className="text-label-lg font-semibold text-ink">{label}</span>;
  }
  // list, comm-list
  return <span className="text-body-sm text-ink">{label}</span>;
}

// ---------------------------------------------------------------------------
// Commission price section (comm-* variants)
// ---------------------------------------------------------------------------

type CommVariant =
  | 'comm-header'
  | 'comm-list'
  | 'comm-list-na'
  | 'comm-discount'
  | 'comm-subtotal'
  | 'comm-total';

function CommPriceSection({
  variant,
  fare,
  commPercent,
  commission,
}: {
  variant: CommVariant;
  fare: string | undefined;
  commPercent: string | undefined;
  commission: string | undefined;
}) {
  if (variant === 'comm-header') {
    return (
      <div className="flex items-center gap-6 text-[11px] font-semibold leading-[1.2] text-ink-secondary">
        <span className="w-[90px] text-right">FARE</span>
        <span className="w-[49px] text-right">COMM %</span>
        <span className="w-[90px] text-right">COMMISSION</span>
      </div>
    );
  }
  if (variant === 'comm-list-na') {
    return (
      <div className="flex items-center gap-6">
        <span className="w-[90px] text-right text-label-md font-semibold text-ink-disabled">
          Not eligible
        </span>
        <span className="w-[49px] text-right text-body-sm text-ink-disabled">—</span>
        <span className="w-[90px] text-right text-body-sm text-ink-disabled">—</span>
      </div>
    );
  }
  if (variant === 'comm-discount') {
    return (
      <div className="flex items-center gap-6">
        <span className="w-[90px] text-right text-body-sm text-viking-red">
          {fare !== undefined ? `– ${fare}` : ''}
        </span>
        <span className="w-[49px] text-right text-body-sm text-ink-disabled">—</span>
        <span className="w-[90px] text-right text-body-sm text-ink-disabled">—</span>
      </div>
    );
  }
  if (variant === 'comm-subtotal') {
    return (
      <div className="flex items-center gap-6">
        <span className="w-[90px] text-right text-label-lg font-semibold text-ink">{fare}</span>
        <span className="w-[49px] text-right text-label-lg font-semibold text-ink-tertiary">
          {commPercent}
        </span>
        <span className="w-[90px] text-right text-label-lg font-semibold text-ink-tertiary">
          {commission}
        </span>
      </div>
    );
  }
  if (variant === 'comm-total') {
    return (
      <div className="flex items-center gap-6">
        <span className="w-[90px] text-right text-title-lg font-semibold text-ink">{fare}</span>
        <span className="w-[49px] text-right text-title-lg font-semibold text-ink-tertiary">
          {commPercent}
        </span>
        <span className="w-[90px] text-right text-title-lg font-semibold text-ink-tertiary">
          {commission}
        </span>
      </div>
    );
  }
  // comm-list
  return (
    <div className="flex items-center gap-6">
      <span className="w-[90px] text-right text-body-sm text-ink">{fare}</span>
      <span className="w-[49px] text-right text-body-sm text-ink-tertiary">{commPercent}</span>
      <span className="w-[90px] text-right text-body-sm text-ink-tertiary">{commission}</span>
    </div>
  );
}
