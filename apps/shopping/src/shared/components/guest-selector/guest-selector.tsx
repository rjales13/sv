import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';

/*
  GuestSelector — guest row in the Viking Air selector
  (ShoppingApp_UX-VD, node 1282:155036).

  Three variants from Figma:
    default    → name + customer # + birthday (no remove button)
    removable  → default layout + Remove button (shown when onRemove is provided)
    simple     → name + customer number value only (compact, no labels, no birthday)
*/

export type GuestSelectorVariant = 'default' | 'removable' | 'simple';

export interface GuestSelectorProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Display variant — controls visible fields and remove button. */
  variant?: GuestSelectorVariant;
  /** Guest full name, e.g. "Mr. John Smith Whitcombe". */
  name: string;
  /** EVO customer number, e.g. "100838606001". */
  customerNumber: string;
  /** Guest birthday as a formatted string, e.g. "5/23/1972". Shown in default and removable. */
  birthday?: string;
  /** Called when the Remove button is pressed. Renders the button only in the removable variant. */
  onRemove?: () => void;
}

export function GuestSelector({
  variant = 'default',
  name,
  customerNumber,
  birthday,
  onRemove,
  className,
  ...divProps
}: GuestSelectorProps) {
  const isSimple = variant === 'simple';
  const showBirthday = !isSimple;
  const showRemove = variant === 'removable' && onRemove !== undefined;

  return (
    <div
      data-slot="guest-selector"
      className={cn('flex w-[322px] flex-col', isSimple ? 'gap-0.5' : 'gap-1', className)}
      {...divProps}
    >
      {/* Name row with optional Remove button */}
      <div className="flex h-[18px] items-center justify-between">
        <span className="truncate text-label-md font-semibold text-fjord">{name}</span>
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="flex h-6 shrink-0 items-center gap-1 rounded-xs px-1.5 py-1 text-viking-red"
          >
            <Icon name="IconNavigationClose16" size={16} tone="current" />
            <span className="text-label-sm font-semibold">Remove</span>
          </button>
        )}
      </div>

      {/* Data row. Figma fixes the simple row at 16px and lets the 19.5px line overflow,
          which is what makes the simple selector 36px tall. */}
      <div className={cn('flex items-start gap-4', isSimple && 'h-4')}>
        {/* Customer number column */}
        <div className={cn('flex w-[108.5px]', isSimple ? '' : 'flex-col gap-1')}>
          {!isSimple && <span className="text-label-sm font-semibold text-fjord">Customer #</span>}
          <span className="text-body-sm font-normal text-ink">{customerNumber}</span>
        </div>

        {/* Birthday column (default and removable only) */}
        {showBirthday && (
          <div className="flex w-[108.5px] flex-col gap-1">
            <span className="text-label-sm font-semibold text-fjord">Birthday</span>
            {birthday && <span className="text-body-sm font-normal text-ink">{birthday}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
