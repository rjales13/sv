import { Avatar, AvatarFallback } from '@vikings/ui/components/avatar';
import { Badge } from '@vikings/ui/components/badge';
import { Icon, type IconName } from '@vikings/ui/components/icon';
import { Separator } from '@vikings/ui/components/separator';
import { cn } from '@vikings/ui/lib/utils';
import { useState } from 'react';

/*
  CustomerCard — the contact band's header row (ShoppingApp_UX-VD, node 1164:209432,
  "CustomerCard--Vertical expansion"). Figma's 11 variants are states of the data:
    Default-1PAX / Default-2PAX     → customer contact, guests listed
    Unselected                      → customer contact, no guest chosen yet
    Expanded-*                      → expanded: selected-blue row, back chevron in the avatar
    TA-*                            → travel-agent contact (keeps its initials when expanded)
    Unselected-collapsed / -expanded → no contact: person glyph, no guest summary

  Standalone by decision: `@vikings/ui` CustomerCard (rendered by GuestContextBand) is an
  earlier hand-built card with an expanded contact panel; this one is the Figma header only.

  Code connections used:
    Avatar (sm) + AvatarFallback  contact avatar (initials, or a glyph)
    Icon                          IconNavigationChevronLeft16 (expanded customer) ·
                                  IconContentPerson16 (unselected contact)
    Badge                         "Past Guest" (info) · "Travel Agent"
    Separator (vertical)          rule between contact and guest summary

  Travel-agent avatar uses Figma's success-700 (#026e5b), a palette step with no DS token.
  The badge deliberately does NOT use Figma's success-400 (#269b89): white 12px text on it
  is ~3.4:1, failing WCAG AA 4.5:1. The DS `success` badge (#005e4c, ~7.8:1) is used instead.
*/

export interface CustomerCardContact {
  role: 'customer' | 'travel-agent';
  name: string;
  id: string;
  /** Customer has sailed with Viking before — shows the "Past Guest" badge. */
  pastGuest?: boolean;
}

export interface CustomerCardProps {
  /** The contact on the call. Omit while none is selected. */
  contact?: CustomerCardContact;
  /** Names of the guests travelling. Empty reads "Unselected". */
  guests: string[];
  /** Controlled expanded state. Omit to let the card manage it (starts collapsed). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

const OVERLINE = 'text-overline font-semibold uppercase tracking-[0.08em] text-ink-tertiary';

export function CustomerCard({
  contact,
  guests,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: CustomerCardProps) {
  const [expandedState, setExpandedState] = useState(false);
  const expanded = expandedProp ?? expandedState;

  const toggle = () => {
    setExpandedState(!expanded);
    onExpandedChange?.(!expanded);
  };

  return (
    <div
      data-slot="customer-card"
      data-expanded={expanded}
      className={cn('w-full drop-shadow-[0px_10px_20px_rgba(0,0,0,0.09)]', className)}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={toggle}
        className={cn(
          'flex h-[63px] w-full items-center justify-between border border-line px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-fjord focus-visible:ring-inset',
          expanded ? 'bg-selected' : 'bg-surface',
        )}
      >
        <span className="relative h-[61px] w-[683px] shrink-0">
          <span className="absolute top-0 left-0 flex items-start gap-3 py-3">
            <ContactAvatar contact={contact} expanded={expanded} />
            <ContactIdentity contact={contact} />
          </span>
          {contact && (
            <>
              <Separator
                orientation="vertical"
                className="absolute top-[10.5px] left-[337px] h-10 bg-line-selected"
              />
              <span className="absolute top-0.5 left-[360px] flex w-[326px] flex-col gap-0.5 py-3">
                <span className={cn(OVERLINE, 'h-[15px]')}>
                  {guests.length > 0 ? `Guests (${guests.length})` : 'Guests'}
                </span>
                <span className={cn('text-body-xsm text-ink', guests.length === 0 && 'italic')}>
                  {guests.length > 0 ? guests.join(', ') : 'Unselected'}
                </span>
              </span>
            </>
          )}
        </span>
        {/* Figma reserves an empty 32px slot at the row's end. */}
        <span aria-hidden="true" className="size-8 shrink-0" />
      </button>
    </div>
  );
}

function ContactAvatar({
  contact,
  expanded,
}: {
  contact: CustomerCardContact | undefined;
  expanded: boolean;
}) {
  const isAgent = contact?.role === 'travel-agent';
  const glyph: IconName | undefined = !contact
    ? 'IconContentPerson16'
    : expanded && !isAgent
      ? 'IconNavigationChevronLeft16'
      : undefined;

  return (
    <Avatar size="sm">
      <AvatarFallback
        className={cn(
          'text-label-sm font-semibold text-ink-on-brand',
          isAgent ? 'bg-[#026e5b]' : 'bg-surface-inverse',
        )}
      >
        {glyph ? (
          <Icon
            name={glyph}
            size={16}
            tone="current"
            aria-hidden
            data-slot={
              glyph === 'IconNavigationChevronLeft16' ? 'customer-card-chevron' : undefined
            }
          />
        ) : (
          initialsOf(contact?.name ?? '')
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function ContactIdentity({ contact }: { contact: CustomerCardContact | undefined }) {
  if (!contact) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="text-label-md font-semibold text-fjord italic">Unselected Contact</span>
        <span className="text-body-xsm text-ink">---</span>
      </span>
    );
  }
  return (
    <>
      <span className="flex flex-col gap-0.5">
        <span className="text-label-md font-semibold whitespace-nowrap text-fjord">
          {contact.name}
        </span>
        <span className="text-body-xsm text-ink">{contact.id}</span>
      </span>
      {contact.role === 'travel-agent' ? (
        <Badge variant="success">Travel Agent</Badge>
      ) : (
        contact.pastGuest && <Badge variant="info">Past Guest</Badge>
      )}
    </>
  );
}

/** Two-letter monogram, e.g. "Mr. John Smith Whitcombe" → "JS"; honorifics are skipped. */
function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => word !== '' && !word.endsWith('.'));
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}
