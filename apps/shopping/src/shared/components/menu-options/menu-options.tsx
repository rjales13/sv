import { DropdownMenuOption } from '@vikings/ui/components/dropdown-menu';
import { cn } from '@vikings/ui/lib/utils';
import { GuestSelector } from '@/shared/components/guest-selector';

/*
  MenuOptionComplex — a menu row whose content is a guest rather than a text label
  (ShoppingApp_UX-VD, node 1286:155666, "MenuOption-COMPLEX").
    s-default / s-hover / s-focus / s-selected / s-disabled → DropdownMenuOption states
    (hover and focus are CSS-driven; `selected` and `disabled` are props)

  Built on DropdownMenuOption so the row is a real option: role="option", selection
  on click / Enter / Space, and roving arrow-key focus inside a DropdownMenu.

  Code connections used:
    GuestSelector (1309:165696 …) variant="simple" — name + customer number
    Icon IconActionCheck16 (1309:165697) — the trailing check, drawn by MenuOption
      when `selected`

  Deviations: Figma focuses with a 1px border that grows the row to 54px; the DS
  inset focus ring keeps it at 52px. Disabled ink is the DS text-disabled token
  (#666, contrast-safe) rather than Figma's #979797.
*/

export interface MenuOptionComplexProps {
  guest: { name: string; customerNumber: string };
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function MenuOptionComplex({
  guest,
  selected = false,
  disabled = false,
  onSelect,
  className,
}: MenuOptionComplexProps) {
  return (
    <DropdownMenuOption
      selected={selected}
      disabled={disabled}
      {...(onSelect && { onSelect })}
      className={cn(
        'w-[322px] rounded-none px-4 py-2',
        // GuestSelector sets its own ink; a disabled row greys all of it.
        'data-[disabled=true]:[&_[data-slot=guest-selector]_*]:text-ink-disabled',
        className,
      )}
    >
      <GuestSelector
        variant="simple"
        name={guest.name}
        customerNumber={guest.customerNumber}
        className="w-full"
      />
    </DropdownMenuOption>
  );
}
