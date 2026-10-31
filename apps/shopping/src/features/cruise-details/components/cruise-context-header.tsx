import { Badge } from '@vikings/ui/components/badge';
import type { CruiseHeaderModel } from '../lib/cruise-header-model.ts';

// The cruise-context header: the identity band that stays put while the agent moves across
// the four cruise-details tabs, so they never lose track of which sailing they are pricing.

export function CruiseContextHeader({ model }: { model: CruiseHeaderModel }) {
  return (
    <section
      data-testid="cruise-context-header"
      aria-label={`Cruise ${model.cruiseName}`}
      className="flex flex-col gap-2 border-b border-subtle bg-surface px-6 py-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        {model.brandTag !== undefined && <Badge>{model.brandTag}</Badge>}
        <h2 className="text-base font-semibold text-fjord">{model.cruiseName}</h2>
        <span className="text-caption text-ink-secondary">{model.shipName}</span>
        <span className="text-caption text-ink-secondary">{model.cruiseId}</span>
        {/* Pushed right in the frames; it is status, not identity. */}
        {model.remaining !== undefined && (
          <span className="ml-auto text-caption text-ink-secondary">{model.remaining}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-caption text-ink-secondary">
        <span className="font-semibold text-ink">{model.route}</span>
        <span>{model.nightsLabel}</span>
        <span>{model.embark}</span>
        <span aria-hidden="true">→</span>
        <span>{model.debark}</span>
      </div>
    </section>
  );
}
