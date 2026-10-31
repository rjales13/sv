import { Switch } from '@vikings/ui/components/switch';
import { cn } from '@vikings/ui/lib/utils';
import { useId } from 'react';
import { GuestSelector } from '@/shared/components/guest-selector';

/*
  CustomerHeader — the customer's identity block with the "Traveling as Guest 1 / Main
  PAX" switch (ShoppingApp_UX-VD, node 1286:156084). One Figma state, no variants.

  Code connections used:
    GuestSelector (1286:156065) variant="default" — name, customer #, birthday.
      The snippet passes onRemove, but the default variant never shows Remove, so
      none is wired.
    Switch        (1286:156067) size="sm" — whether this customer travels as the main PAX.
*/

const TRAVELING_AS_MAIN_LABEL = 'Traveling as Guest 1/ Main PAX';

export interface CustomerHeaderProps {
  guest: { name: string; customerNumber: string; birthday?: string };
  /** The customer travels as Guest 1 / main passenger. */
  travelingAsMain: boolean;
  onTravelingAsMainChange?: (travelingAsMain: boolean) => void;
  className?: string;
}

export function CustomerHeader({
  guest,
  travelingAsMain,
  onTravelingAsMainChange,
  className,
}: CustomerHeaderProps) {
  const switchId = useId();

  return (
    <div
      data-slot="customer-header"
      className={cn('flex w-[356px] flex-col items-start gap-[13px] px-4', className)}
    >
      <GuestSelector
        variant="default"
        name={guest.name}
        customerNumber={guest.customerNumber}
        {...(guest.birthday !== undefined && { birthday: guest.birthday })}
        className="w-full"
      />
      <div className="flex items-center gap-2">
        <Switch
          id={switchId}
          size="sm"
          checked={travelingAsMain}
          onCheckedChange={(checked) => onTravelingAsMainChange?.(checked)}
        />
        <label htmlFor={switchId} className="text-body-sm text-ink">
          {TRAVELING_AS_MAIN_LABEL}
        </label>
      </div>
    </div>
  );
}
