import { Button } from '@vikings/ui/components/button';
import { Icon } from '@vikings/ui/components/icon';
import { Label } from '@vikings/ui/components/label';
import { cn } from '@vikings/ui/lib/utils';
import { useId, useState } from 'react';
import {
  ContactDetails,
  type ContactDetailsProps,
} from '@/features/guest-management/components/contact-details';
import { GuestHeader } from '@/features/guest-management/components/guest-header';
import {
  InfoPreferences,
  type InfoPreferencesProps,
} from '@/features/guest-management/components/info-preferences';
import { GuestSelector } from '@/shared/components/guest-selector';
import {
  type AssociatedContactsGroup,
  AssociatedContactsSelect,
} from './associated-contacts-select.tsx';

/*
  GuestSidebar — one guest's panel in the guest-management sidebar (ShoppingApp_UX-VD,
  node 1286:156183). Figma's variants are derived from the data:
    Default            → `guest` given: selector, contact details, info & preferences
    Empty              → no guest, `associatedContacts` given: header Add Guest + dropdown
    Disabled           → Empty with `disabled`: Add Guest and dropdown greyed
    TA-GuestUnselected → no guest, no dropdown: empty state with its own Add guest button
  The `customer dropdown` boolean is the presence of `associatedContacts`.

  Code connections used:
    GuestHeader (1286:156105 …)            title, collapse, Add Guest (disabled in Disabled)
    GuestSelector (1297:163603)            variant="removable" → onRemoveGuest
    ContactDetails (1286:156109)           contact + Edit → onEditContact
    InfoPreferences (1286:156110)          info
    InputMultiselect + Label (1297:161533 …) "Associated Contacts", placeholder "Select Guest" —
      AssociatedContactsSelect: opens as grouped MenuOptionComplex guest rows
    Icon IconContentPerson (2715:202065)   empty-state badge glyph
    Button secondary (2715:202067)         empty-state "Add guest" with leading IconActionAdd

  Figma's dropdown is the x-lg (44px) size; the field is kept at the DS 40px, as InputSelect.
*/

export interface GuestSidebarProps {
  /** Header text, e.g. "Guest 1 / Main PAX". */
  title: string;
  /** The selected guest. Omit while none is chosen. */
  guest?: {
    name: string;
    customerNumber: string;
    birthday?: string;
    contact: ContactDetailsProps['contact'];
    info: InfoPreferencesProps['info'];
  };
  onRemoveGuest?: () => void;
  onEditContact?: () => void;
  /** Adds a guest — the header button (with the dropdown) or the empty-state CTA (without). */
  onAddGuest?: () => void;
  /** The "Associated Contacts" dropdown (Figma's `customer dropdown`); omit to hide it. */
  associatedContacts?: {
    groups: AssociatedContactsGroup[];
    /** Id of the chosen contact. */
    value?: string;
    onValueChange?: (id: string) => void;
  };
  /** Greys out Add Guest and the dropdown. */
  disabled?: boolean;
  className?: string;
}

export function GuestSidebar({
  title,
  guest,
  onRemoveGuest,
  onEditContact,
  onAddGuest,
  associatedContacts,
  disabled = false,
  className,
}: GuestSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const showEmptyState = !guest && !associatedContacts;
  // The header offers Add Guest only in Empty / Disabled; TA uses the empty-state CTA instead.
  const headerAddGuest = !guest && associatedContacts ? onAddGuest : undefined;

  return (
    <div
      data-slot="guest-sidebar"
      className={cn(
        'flex w-[356px] flex-col gap-4 pb-5',
        showEmptyState ? 'items-center' : 'items-start',
        className,
      )}
    >
      <GuestHeader
        title={title}
        expanded={expanded}
        onExpandedChange={setExpanded}
        {...(headerAddGuest && { onAddGuest: headerAddGuest, addGuestDisabled: disabled })}
        className="w-full"
      />

      {expanded && guest && (
        <>
          <div className="px-4">
            <GuestSelector
              variant="removable"
              name={guest.name}
              customerNumber={guest.customerNumber}
              {...(guest.birthday !== undefined && { birthday: guest.birthday })}
              {...(onRemoveGuest && { onRemove: onRemoveGuest })}
            />
          </div>
          <div className="flex flex-col gap-3 px-4">
            <ContactDetails
              contact={guest.contact}
              {...(onEditContact && { onEdit: onEditContact })}
            />
            <InfoPreferences info={guest.info} />
          </div>
        </>
      )}

      {expanded && associatedContacts && (
        <AssociatedContacts {...associatedContacts} disabled={disabled} padBottom={!!guest} />
      )}

      {expanded && showEmptyState && (
        <>
          <span className="flex size-[78px] shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <Icon name="IconContentPerson" size={24} tone="muted" aria-hidden />
          </span>
          <p className="w-[254px] text-center text-label-sm font-semibold text-ink-secondary">
            No guest has been added
          </p>
          {onAddGuest && (
            <Button variant="secondary" size="default" onClick={onAddGuest} disabled={disabled}>
              <Icon name="IconActionAdd" size={20} tone="current" className="size-5" aria-hidden />
              Add guest
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function AssociatedContacts({
  groups,
  value,
  onValueChange,
  disabled,
  padBottom,
}: NonNullable<GuestSidebarProps['associatedContacts']> & {
  disabled: boolean;
  padBottom: boolean;
}) {
  const id = useId();
  return (
    // Figma's Default frame is 72px around the 64px field; the Empty frames hug it.
    <div className={cn('flex w-full flex-col gap-1.5 px-4', padBottom && 'pb-2')}>
      <Label htmlFor={id} className="text-label-sm">
        Associated Contacts
      </Label>
      <AssociatedContactsSelect
        id={id}
        groups={groups}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </div>
  );
}
