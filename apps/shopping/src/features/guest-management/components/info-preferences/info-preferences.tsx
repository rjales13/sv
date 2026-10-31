import { cn } from '@vikings/ui/lib/utils';
import { useState } from 'react';
import { SubSectionTitle } from '@/features/guest-management/components/sub-section-title';

/*
  InfoPreferences — the guest panel's "Info & preferences" section (ShoppingApp_UX-VD,
  node 1282:155138): a collapsible SubSectionTitle over a two-column grid of six facts.
    expanded  → title + grid
    collapsed → title only

  Code connections used:
    SubSectionTitle (3586:146709 expanded, 3586:146790 collapsed) — the
      "info&prefe-expanded" / "infopref-collapsed" variants: title "Info & preferences",
      no Edit button, so no onEdit is passed.

  Unlike ContactDetails, Figma keeps the title at SubSectionTitle's own 306px, centred in
  the 322px section, so it is not stretched.
*/

const SECTION_TITLE = 'Info & preferences';

export interface InfoPreferencesProps {
  info: {
    propensityScore: string;
    pastTravels: string;
    osVouchers: string;
    bnd: string;
    localTime: string;
    offeredBookings: string;
  };
  /** Controlled expanded state. Omit to let the section manage it (starts expanded). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

export function InfoPreferences({
  info,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: InfoPreferencesProps) {
  const [expandedState, setExpandedState] = useState(true);
  const expanded = expandedProp ?? expandedState;

  const handleExpandedChange = (next: boolean) => {
    setExpandedState(next);
    onExpandedChange?.(next);
  };

  // Row-major, matching Figma's grid: left column then right column on each row.
  const fields: [label: string, value: string][] = [
    ['Propensity Score', info.propensityScore],
    ['Past Travels', info.pastTravels],
    ['O/S Vouchers', info.osVouchers],
    ['BND', info.bnd],
    ['Local Time', info.localTime],
    ['Offered Bookings', info.offeredBookings],
  ];

  return (
    <section
      data-slot="info-preferences"
      aria-label={SECTION_TITLE}
      className={cn('flex w-[322px] flex-col items-center gap-1', className)}
    >
      <SubSectionTitle
        title={SECTION_TITLE}
        expanded={expanded}
        onExpandedChange={handleExpandedChange}
      />
      {expanded && (
        <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-2 pl-7">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-label-sm font-semibold text-fjord">{label}</dt>
              <dd className="text-body-sm text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
