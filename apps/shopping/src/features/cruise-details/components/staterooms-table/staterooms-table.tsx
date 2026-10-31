import { Checkbox } from '@vikings/ui/components/checkbox';
import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { VAlert } from '@/shared/components/alert';

/*
  StateroomsTable — scrollable stateroom-selection table
  (ShoppingApp_UX-VD, node 2566:122877).

  Three display states, derived from data:
    empty    — rows absent or empty → icon-badge + "Select a Stateroom Category"
    default  — rows present → scrollable list with checkboxes
    gty-only — rows present + isGtyOnly=true → list (normally one GTY row) + info alert

  Layout: 308×540px card with a sticky 42px header and a scrollable body.
  Row structure: [42px checkbox cell] [3px spacer] [text — starts at x=57]

  Code connections used:
    Checkbox (InputCheckbox)   — @vikings/ui/components/checkbox, size="sm" (16px)
    VAlert   (Alert Info)      — shared/components/alert, variant="info"
    Icon     (icon-badge glyph) — @vikings/ui/components/icon, IconContentHotel
*/

const GTY_TITLE = 'Guarantee Only';
const GTY_MESSAGE =
  'No physical staterooms are available in this category. A Guarantee (GTY) secures the selected category at this fare — Viking will assign the specific stateroom at embarkation.';

export interface StateroomsTableRow {
  /** Stateroom number (e.g. "5047") or "GTY" for guarantee-only. */
  stateroom: string;
  /** Whether the row's checkbox is currently checked. Defaults to false. */
  checked?: boolean;
}

export interface StateroomsTableProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Rows to display. Absent or empty → shows the empty-state placeholder. */
  rows?: StateroomsTableRow[];
  /**
   * When true, an info alert explaining the GTY (Guarantee Only) option is shown
   * below the rows. Typically set when the only bookable stateroom is "GTY".
   */
  isGtyOnly?: boolean;
  /** Called when the user toggles a row's checkbox. */
  onRowChange?: (stateroom: string, checked: boolean) => void;
  /**
   * Called with the stateroom the agent is pointing at, or `null` when they move away.
   *
   * Drives the deck plan beside this table, so the room lights up as the agent runs down the
   * list. Fires on focus as well as hover — a keyboard user arrowing through the rows gets the
   * same feedback as a mouse user, and a hover-only affordance would simply not exist for them.
   */
  onRowHover?: (stateroom: string | null) => void;
}

export function StateroomsTable({
  rows,
  isGtyOnly,
  onRowChange,
  onRowHover,
  className,
  ...divProps
}: StateroomsTableProps) {
  const isEmpty = !rows || rows.length === 0;

  return (
    <div
      data-slot="staterooms-table"
      className={cn(
        // Height comes from the container: the tab sizes this card to the deck plan beside it.
        'flex h-full w-[308px] flex-col overflow-hidden rounded-md bg-white shadow-raised',
        className,
      )}
      {...divProps}
    >
      {/* Sticky column header */}
      <div className="sticky top-0 z-10 flex h-[42px] w-full shrink-0 items-center border-b border-line-subtle bg-surface-muted">
        <div className="w-[42px] shrink-0" aria-hidden />
        <div className="w-[3px] shrink-0" aria-hidden />
        <span className="text-overline font-semibold uppercase tracking-overline text-ink">
          STATEROOM
        </span>
      </div>

      {/* Scrollable body */}
      <div data-slot="staterooms-table-body" className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state — no category selected yet */
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex size-[78px] items-center justify-center rounded-full bg-surface-muted">
              <Icon name="IconLodgingKingBed" size={24} tone="muted" aria-hidden />
            </div>
            <p className="text-center text-title-lg font-semibold text-fjord">
              Select a Stateroom Category
            </p>
          </div>
        ) : (
          <>
            {rows.map((row) => (
              /* The pointer handlers below are a redundant enhancement, not the only route to
                 this state: `onFocusCapture` fires the same callback from the row's checkbox,
                 which is a real control, so a keyboard user highlights cabins on the plan
                 without a mouse. Giving the row an ARIA role purely to satisfy the rule would
                 claim a semantic it does not have. */
              // biome-ignore lint/a11y/noStaticElementInteractions: hover mirrors focus; see above
              <div
                key={row.stateroom}
                onMouseEnter={() => onRowHover?.(row.stateroom)}
                onMouseLeave={() => onRowHover?.(null)}
                onFocusCapture={() => onRowHover?.(row.stateroom)}
                onBlurCapture={() => onRowHover?.(null)}
                className={cn(
                  'flex h-[42px] w-full items-center border-b border-line-subtle',
                  row.checked === true ? 'border-l-2 border-l-fjord bg-selected' : 'bg-white',
                  onRowHover !== undefined && 'hover:bg-surface-hover',
                )}
              >
                <div className="flex w-[42px] shrink-0 items-center justify-center pl-[11px] pr-[12px]">
                  <Checkbox
                    size="sm"
                    checked={row.checked ?? false}
                    onCheckedChange={(checked) => onRowChange?.(row.stateroom, checked === true)}
                    aria-label={`Select stateroom ${row.stateroom}`}
                  />
                </div>
                <div className="w-[3px] shrink-0" aria-hidden />
                <span className="pl-3 text-label-md font-semibold text-fjord">{row.stateroom}</span>
              </div>
            ))}

            {isGtyOnly && (
              /* GTY-only: no physical staterooms — explain the guarantee option */
              <div className="p-3">
                <VAlert variant="info" title={GTY_TITLE} description={GTY_MESSAGE} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
