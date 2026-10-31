import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@vikings/ui/components/dropdown-menu';
import { Icon } from '@vikings/ui/components/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@vikings/ui/components/popover';
import { cn } from '@vikings/ui/lib/utils';
import { Fragment, useRef, useState } from 'react';
import { MenuOptionComplex } from '@/shared/components/menu-options';

/*
  AssociatedContactsSelect — the "Associated Contacts" dropdown in GuestSidebar. The
  field is Figma's InputMultiselect (1278:154179), but its description says it picks
  *one* value, and the open menu lists guests, not text labels: grouped
  MenuOptionComplex rows (name + customer number) under uppercase headers, with a
  trailing check on the chosen one.

  MultiSelect can't host those rows — it renders its own multi-mode options with
  checkboxes — so this composes the same Popover + DropdownMenu it uses, in single
  mode, and repeats its field-styled trigger.

  Figma has no open state for this field; the menu layout follows the reference
  screenshot of the Empty sidebar with the dropdown expanded.
*/

export interface AssociatedContact {
  id: string;
  name: string;
  customerNumber: string;
  disabled?: boolean;
}

export interface AssociatedContactsGroup {
  /** Header shown above the group, e.g. "Household members". */
  label: string;
  contacts: AssociatedContact[];
}

export interface AssociatedContactsSelectProps {
  groups: AssociatedContactsGroup[];
  /** Id of the chosen contact. */
  value?: string | undefined;
  onValueChange?: ((id: string) => void) | undefined;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

export function AssociatedContactsSelect({
  groups,
  value,
  onValueChange,
  placeholder = 'Select Guest',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
}: AssociatedContactsSelectProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chosen = groups.flatMap((g) => g.contacts).find((c) => c.id === value);

  const pick = (contactId: string) => {
    onValueChange?.(contactId);
    setOpen(false);
  };

  // Omit onOpenChange while disabled so the popover can't be toggled (see MultiSelect).
  return (
    <Popover open={open} {...(!disabled && { onOpenChange: setOpen })}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          data-slot="associated-contacts-select"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-sm bg-surface px-4 text-left text-sm whitespace-nowrap outline-none select-none',
            'shadow-[var(--vk-ring-default)] hover:shadow-[var(--vk-ring-hover)]',
            'focus-visible:shadow-[var(--vk-ring-focus)] aria-[expanded=true]:shadow-[var(--vk-ring-focus)]',
            'disabled:pointer-events-none disabled:bg-surface-muted disabled:text-ink-disabled disabled:shadow-none',
            className,
          )}
        >
          <span className={cn('flex-1 truncate', chosen ? 'text-ink' : 'text-ink-disabled')}>
            {chosen?.name ?? placeholder}
          </span>
          <Icon
            name="IconNavigationExpandMore16"
            size={16}
            tone="muted"
            className="pointer-events-none shrink-0"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        aria-label={ariaLabel ?? placeholder}
        // Rows run edge to edge so the selected fill spans the panel, as in the design. Capped
        // like MultiSelect: 20rem, or less when the viewport has less room below the trigger;
        // the menu inside shrinks to fit and scrolls.
        className="max-h-[min(20rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] gap-0 px-0 py-1"
        onOpenAutoFocus={(e) => {
          // Land focus on the chosen (or first enabled) guest instead of the panel.
          e.preventDefault();
          const root = contentRef.current;
          (
            root?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
            root?.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
          )?.focus();
        }}
      >
        <DropdownMenu aria-label={ariaLabel ?? placeholder}>
          {groups.map((group, index) => (
            <Fragment key={group.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup
                label={group.label}
                aria-label={group.label}
                className="[&>[data-slot=dropdown-menu-label]]:px-4"
              >
                {group.contacts.map((contact) => (
                  <MenuOptionComplex
                    key={contact.id}
                    guest={contact}
                    selected={contact.id === value}
                    disabled={contact.disabled ?? false}
                    onSelect={() => pick(contact.id)}
                    className="w-full"
                  />
                ))}
              </DropdownMenuGroup>
            </Fragment>
          ))}
        </DropdownMenu>
      </PopoverContent>
    </Popover>
  );
}
