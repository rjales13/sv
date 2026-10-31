import { cn } from '@vikings/ui/lib/utils';
import { useState } from 'react';
import { SubSectionTitle } from '@/features/guest-management/components/sub-section-title';

/*
  ContactDetails — the guest panel's "Contact details" section (ShoppingApp_UX-VD,
  node 1282:155123): a collapsible SubSectionTitle over Email / Phone / Address.
    Default   → expanded: fields shown, Edit available when `onEdit` is given
    collapsed → title only

  Code connections used:
    SubSectionTitle (1282:155125 Default, 1282:155137 collapsed) — title, expanded, onEdit

  Figma's collapsed variant keeps an *expanded* SubSectionTitle instance and swaps its
  chevron to chevron_left with the Edit button off. That draws exactly what the
  collapsed SubSectionTitle draws, so it is expressed as `expanded={false}` here.
*/

const SECTION_TITLE = 'Contact details';

export interface ContactDetailsProps {
  contact: { email: string; phone: string; address: string };
  /** Controlled expanded state. Omit to let the section manage it (starts expanded). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Shows the Edit button in the title and handles it. */
  onEdit?: () => void;
  className?: string;
}

export function ContactDetails({
  contact,
  expanded: expandedProp,
  onExpandedChange,
  onEdit,
  className,
}: ContactDetailsProps) {
  const [expandedState, setExpandedState] = useState(true);
  const expanded = expandedProp ?? expandedState;

  const handleExpandedChange = (next: boolean) => {
    setExpandedState(next);
    onExpandedChange?.(next);
  };

  return (
    <section
      data-slot="contact-details"
      aria-label={SECTION_TITLE}
      className={cn(
        'flex w-[322px] flex-col items-center',
        expanded ? 'gap-1' : 'gap-2',
        className,
      )}
    >
      <SubSectionTitle
        title={SECTION_TITLE}
        expanded={expanded}
        onExpandedChange={handleExpandedChange}
        {...(onEdit && { onEdit })}
        className="w-full"
      />
      {expanded && (
        <dl className="flex w-full flex-col gap-2 pl-7">
          <ContactField label="Email" value={contact.email} />
          <ContactField label="Phone" value={contact.phone} />
          <ContactField label="Address" value={contact.address} />
        </dl>
      )}
    </section>
  );
}

function ContactField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label-sm font-semibold text-fjord">{label}</dt>
      <dd className="text-body-sm text-ink">{value}</dd>
    </div>
  );
}
