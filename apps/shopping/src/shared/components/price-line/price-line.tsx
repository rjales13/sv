import { Tag } from '@vikings/ui/components/tag';
import { cn } from '@vikings/ui/lib/utils';

/*
  PriceLine — one priced stateroom category in the fare grid
  (ShoppingApp_UX-VD, node 608:124444; the inner frame is named PriceTierRow).

  Figma draws 7 flat variants, but they are two orthogonal axes: `status` tints
  the chip and mutes the row, `selected` adds the emphasis ring. Hover is CSS.
  So Selected = available + selected, selected-limited = limited + selected.

  The category chip is a DS Tag in its solid status `tone` — the same component
  the design uses — so the fare grid and the filter chips stay one implementation.

  The ring is an inset shadow rather than a border so selection cannot change
  the row's height — Figma's own Selected/selected-limited frames are 32px and
  36px against 34px everywhere else, which would make the grid twitch on click.

  `statA`/`statB` keep the deliberately generic names the existing `FareTier`
  already uses: EVO pairs `OpenCabinsAvailable` with `GTYCabinsAvailable`, but
  the repo's view-model maps slot B to a single-occupancy *price*, and
  `docs/handoff-notes.md` flags these grid values as unreconciled stand-ins.
  See AGENTS.md § 10.
*/

export type PriceLineStatus = 'available' | 'limited' | 'soldout' | 'disabled';

/* The chip is a DS Tag in its solid status `tone`. Only the name differs:
   "disabled" describes the row, "unavailable" describes the inventory. */
const CHIP_TONE = {
  available: 'available',
  limited: 'limited',
  soldout: 'soldout',
  disabled: 'unavailable',
} as const satisfies Record<PriceLineStatus, 'available' | 'limited' | 'soldout' | 'unavailable'>;

/* Colour alone must not carry inventory state (WCAG 1.4.1), so the chip spells
   its status out for screen readers. "Unavailable" reads better than Figma's
   variant name "Disabled", which describes the control, not the inventory. */
const STATUS_LABEL: Record<PriceLineStatus, string> = {
  available: 'Available',
  limited: 'Limited',
  soldout: 'Sold out',
  disabled: 'Unavailable',
};

/** Sold-out and unavailable tiers grey the whole row, not just the chip. */
const MUTED_STATUSES: readonly PriceLineStatus[] = ['soldout', 'disabled'];

function ringFor(selected: boolean, muted: boolean): string {
  if (selected) return 'shadow-[inset_0_0_0_2px_var(--vk-fjord)]';
  if (muted) return 'shadow-[inset_0_0_0_1px_var(--vk-line)]';
  return 'shadow-[inset_0_0_0_1px_var(--vk-line-tint)]';
}

export interface PriceLineProps {
  /**
   * Stateroom category abbreviation, e.g. "DN2" (EVO `categorylist[].Abbrev`). Shown in the chip
   * exactly as EVO sends it — every screen labels a category the same way — and used as the
   * selection key.
   */
  abbrev: string;
  /** Pre-formatted price, e.g. "$114,799". Formatting is the caller's job. */
  price: string;
  /** First stat cell — open cabins available. Renders "-" when omitted. */
  statA?: string;
  /** Second stat cell — semantics pending Viking confirmation. Renders "-" when omitted. */
  statB?: string;
  /** Inventory state — tints the chip and mutes the row. Defaults to "available". */
  status?: PriceLineStatus;
  /** Marks this tier as the chosen one. Orthogonal to `status`. */
  selected?: boolean;
  /** Called when the user clicks this row; not called for soldout/disabled rows. */
  onSelect?: () => void;
  className?: string;
}

export function PriceLine({
  abbrev,
  price,
  statA,
  statB,
  status = 'available',
  selected = false,
  onSelect,
  className,
}: PriceLineProps) {
  const muted = MUTED_STATUSES.includes(status);
  const ink = muted ? 'text-ink-disabled' : 'text-fjord';
  const interactive = !muted && onSelect !== undefined;

  const rowClass = cn(
    'flex w-full items-center gap-1 rounded-sm px-1.5 py-1.5',
    muted ? 'bg-surface-hover' : 'bg-surface-tint',
    interactive && 'cursor-pointer appearance-none border-0 text-left',
    ringFor(selected, muted),
    !muted && !selected && 'hover:bg-selected hover:shadow-[inset_0_0_0_1px_var(--vk-slate)]',
    className,
  );

  const dataAttrs = { 'data-slot': 'price-line', 'data-status': status, 'data-selected': selected };

  const content = (
    <>
      <Tag tone={CHIP_TONE[status]} size="compact" className="min-w-[34px]">
        <span>{abbrev}</span>
        <span className="sr-only">{STATUS_LABEL[status]}</span>
      </Tag>

      <span className={cn('flex-1 whitespace-nowrap text-right text-label-md font-semibold', ink)}>
        {price}
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <span className={cn('w-5 text-center text-body-sm', ink)}>{statA ?? '-'}</span>
        <span
          aria-hidden="true"
          data-slot="price-line-divider"
          className={cn('h-3 w-px', muted ? 'bg-surface-muted' : 'bg-line-selected')}
        />
        <span className={cn('w-5 text-center text-body-sm', ink)}>{statB ?? '-'}</span>
      </span>
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onSelect} className={rowClass} {...dataAttrs}>
        {content}
      </button>
    );
  }

  return (
    <div className={rowClass} {...dataAttrs}>
      {content}
    </div>
  );
}
