import { Button } from '@vikings/ui/components/button';

// The persistent footer bar: it stays put while tab content changes, carrying the running
// total for the ACTIVE cruise only.
//
// Scope boundary (VCX-10327 vs the Build panel story): this owns the collapsed BAR — the
// toggle, the gross total and the three actions. The expanded BREAKDOWN ledger, with its
// per-guest line items and discounts, belongs to the Build panel story and mounts here.
//
// The three actions render but do nothing: Save is out of scope for the prototype
// (docs/scope-functional-prototype.md), and a button that silently no-ops is worse than one
// that is visibly unavailable — hence `disabled` plus a title saying why.

export interface CruiseDetailsFooterProps {
  /** Pre-formatted, because currency formatting is the view-model's job, not the bar's. */
  grossTotal: string;
}

const SAVE_OUT_OF_SCOPE = 'Saving is out of scope for the prototype';
const BREAKDOWN_PENDING = 'The cost breakdown lands with the Build panel story';

export function CruiseDetailsFooter({ grossTotal }: CruiseDetailsFooterProps) {
  return (
    <footer
      data-testid="cruise-details-footer"
      className="shrink-0 flex flex-wrap items-center gap-4 border-t border-subtle bg-surface px-6 py-3"
    >
      {/* This ticket owns the BAR; the panel it expands into is the Build panel story, so the
          toggle is present but inert until that lands — with a title saying which, rather
          than implying the breakdown is out of scope altogether. */}
      <Button variant="ghost" aria-expanded={false} disabled title={BREAKDOWN_PENDING}>
        BREAKDOWN ▲
      </Button>

      <span className="text-caption text-ink-secondary">GROSS TOTAL</span>
      <span data-testid="gross-total" className="text-base font-semibold text-fjord">
        {grossTotal}
      </span>

      <div className="ml-auto flex gap-2">
        <Button variant="secondary" disabled title={SAVE_OUT_OF_SCOPE}>
          SAVE OPPORTUNITY
        </Button>
        <Button variant="secondary" disabled title={SAVE_OUT_OF_SCOPE}>
          SAVE SEARCH
        </Button>
        <Button disabled title={SAVE_OUT_OF_SCOPE}>
          BOOK NOW
        </Button>
      </div>
    </footer>
  );
}
