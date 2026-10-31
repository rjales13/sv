import { Checkbox } from '@vikings/ui/components/checkbox';
import { Icon } from '@vikings/ui/components/icon';
import { Label } from '@vikings/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vikings/ui/components/select';
import { Separator } from '@vikings/ui/components/separator';
import { Switch } from '@vikings/ui/components/switch';
import { cn } from '@vikings/ui/lib/utils';
import { useId, useState } from 'react';
import {
  VikingAirSummary,
  type VikingAirSummaryProps,
} from '@/features/cruise-details/components/viking-air-summary';
import { applyFlightSelection } from '@/features/cruise-details/lib/flight-defaults.ts';
import { GuestSelector } from '@/shared/components/guest-selector';
import { GatewayCombobox } from './gateway-combobox.tsx';

/*
  VikingAirGuestCard — one guest's Viking Air panel (ShoppingApp_UX-VD, node 3292:167937).

  Figma's five variants are states of the same card, derived from props:
    guest 1       — expanded, airfare on, with the "same information for Guest 2" checkbox
    guest 2       — as guest 1 without `copyToNextGuest`
    collapsed     — `expanded={false}`: header only
    no viking air — `includeAirfare={false}`: selects hidden, summary forced to "no-air"
    disabled      — `disabled`: toggle, selects and checkbox locked (the header still collapses)

  Code connections used:
    Icon                   (3292:167848 …) header chevron — ExpandMore (expanded) / ExpandLess16 (collapsed)
    GuestSelector (3292:167855 …) variant="simple"
    Switch                 (3292:167857 …) size="sm" — Include Airfare
    SelectTrigger + Label  (3292:167861 …) Origin Gateway / Class / Return Gateway / Class
    Checkbox               (3292:167864, 3292:173503) size="sm" — copy to next guest
    VikingAirSummary       (3292:167870 …) the Airfare Summary panel

  Width is fluid, not Figma's 1280px frame: the card fills the tab, the form column and its two
  gateway legs absorb the extra space, and the Airfare Summary keeps its designed 492px.

  Figma draws both chevrons rotated 180°, so the expanded card points up and the
  collapsed card points down; the rotation is kept rather than swapping glyphs.
  Select labels use label-sm (12px) as in Figma's InputSelect, not Label's 13px default.
*/

export interface VikingAirGuestCardOption {
  value: string;
  label: string;
}

export interface VikingAirGuestCardSelection {
  originGateway?: string | undefined;
  originClass?: string | undefined;
  returnGateway?: string | undefined;
  returnClass?: string | undefined;
}

export interface VikingAirGuestCardProps
  extends Omit<React.ComponentPropsWithoutRef<'section'>, 'title'> {
  /** Header text, e.g. "Guest 1 / Main PAX". */
  title: string;
  /** The guest this card prices airfare for. */
  guest: { name: string; customerNumber: string };
  /** Controlled expanded state. Omit to let the card manage it (starts expanded). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Whether this guest takes Viking Air. Off hides the selects and shows the "no-air" summary. */
  includeAirfare: boolean;
  onIncludeAirfareChange?: (includeAirfare: boolean) => void;
  /** Locks the toggle, selects and checkbox. */
  disabled?: boolean;
  gatewayOptions: VikingAirGuestCardOption[];
  classOptions: VikingAirGuestCardOption[];
  selection?: VikingAirGuestCardSelection;
  onSelectionChange?: (selection: VikingAirGuestCardSelection) => void;
  /** The "Use the same information for Guest N" checkbox; omit to hide it. */
  copyToNextGuest?: {
    label: string;
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  };
  /** Airfare Summary state and amounts. Defaults to the empty prompt. */
  summary?: VikingAirSummaryProps;
}

export function VikingAirGuestCard({
  title,
  guest,
  expanded: expandedProp,
  onExpandedChange,
  includeAirfare,
  onIncludeAirfareChange,
  disabled = false,
  gatewayOptions,
  classOptions,
  selection = {},
  onSelectionChange,
  copyToNextGuest,
  summary,
  className,
  ...sectionProps
}: VikingAirGuestCardProps) {
  const [expandedState, setExpandedState] = useState(true);
  const expanded = expandedProp ?? expandedState;
  const titleId = useId();
  const bodyId = useId();
  const toggleId = useId();

  const toggleExpanded = () => {
    setExpandedState(!expanded);
    onExpandedChange?.(!expanded);
  };

  // Return leg follows the origin and classes default to Economy — see flight-defaults.ts.
  const selectField = (field: keyof VikingAirGuestCardSelection) => (value: string) => {
    onSelectionChange?.(applyFlightSelection(selection, field, value, classOptions));
  };

  return (
    <section
      data-slot="viking-air-guest-card"
      aria-labelledby={titleId}
      className={cn(
        'flex w-full flex-col items-center gap-6 overflow-hidden rounded-md bg-surface shadow-raised',
        expanded ? 'pb-6' : 'h-[42px]',
        className,
      )}
      {...sectionProps}
    >
      <header className="flex h-[42px] w-full shrink-0 items-center justify-between border-t border-line bg-selected px-3 py-2">
        <p id={titleId} className="text-title-md font-semibold text-fjord">
          {title}
        </p>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
          onClick={toggleExpanded}
          className="flex size-6 items-center justify-center rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-fjord"
        >
          {expanded ? (
            <Icon name="IconNavigationExpandMore" size={24} tone="brand" className="rotate-180" />
          ) : (
            <Icon name="IconNavigationExpandLess16" size={24} tone="brand" className="rotate-180" />
          )}
        </button>
      </header>

      {expanded && (
        <div
          id={bodyId}
          data-slot="viking-air-guest-card-body"
          className={cn(
            'flex w-full justify-between gap-8 px-4',
            includeAirfare ? 'items-center' : 'items-start',
          )}
        >
          <div
            data-slot="viking-air-guest-card-form"
            className="flex min-w-0 flex-1 flex-col gap-6"
          >
            <div className="flex w-full flex-col gap-3">
              <GuestSelector
                variant="simple"
                name={guest.name}
                customerNumber={guest.customerNumber}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Switch
                  id={toggleId}
                  size="sm"
                  checked={includeAirfare}
                  disabled={disabled}
                  onCheckedChange={(checked) => onIncludeAirfareChange?.(checked)}
                />
                <label htmlFor={toggleId} className="text-body-sm text-ink">
                  Include Airfare
                </label>
              </div>
            </div>

            {includeAirfare && (
              <div className="flex w-full items-start gap-4">
                <div
                  data-slot="viking-air-guest-card-leg"
                  className="flex min-w-0 flex-1 flex-col gap-3"
                >
                  <GatewayField
                    label="Origin Gateway"
                    options={gatewayOptions}
                    value={selection.originGateway}
                    disabled={disabled}
                    onValueChange={selectField('originGateway')}
                  />
                  <SelectField
                    label="Class"
                    placeholder="Select Class"
                    options={classOptions}
                    value={selection.originClass}
                    disabled={disabled || selection.originGateway === 'C/O'}
                    onValueChange={selectField('originClass')}
                  />
                  {copyToNextGuest && <CopyToNextGuest {...copyToNextGuest} disabled={disabled} />}
                </div>
                <Separator orientation="vertical" className="h-[164px] bg-line" />
                <div
                  data-slot="viking-air-guest-card-leg"
                  className="flex min-w-0 flex-1 flex-col gap-3"
                >
                  <GatewayField
                    label="Return Gateway"
                    options={gatewayOptions}
                    value={selection.returnGateway}
                    disabled={disabled}
                    onValueChange={selectField('returnGateway')}
                  />
                  <SelectField
                    label="Class"
                    placeholder="Select Class"
                    options={classOptions}
                    value={selection.returnClass}
                    disabled={disabled || selection.returnGateway === 'C/O'}
                    onValueChange={selectField('returnClass')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* The summary keeps its designed width; the form takes whatever the screen adds. */}
          <VikingAirSummary
            {...summary}
            className="shrink-0"
            variant={includeAirfare ? (summary?.variant ?? 'empty') : 'no-air'}
          />
        </div>
      )}
    </section>
  );
}

function GatewayField({
  label,
  options,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  options: VikingAirGuestCardOption[];
  value: string | undefined;
  disabled: boolean;
  onValueChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-label-sm">
        {label}
      </Label>
      <GatewayCombobox
        id={id}
        options={options}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
      />
    </div>
  );
}

function SelectField({
  label,
  placeholder,
  options,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  placeholder: string;
  options: VikingAirGuestCardOption[];
  value: string | undefined;
  disabled: boolean;
  onValueChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-label-sm">
        {label}
      </Label>
      {/* An empty string is Radix's "no selection" value, so the placeholder shows. */}
      <Select value={value ?? ''} onValueChange={onValueChange}>
        <SelectTrigger id={id} size="default" disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CopyToNextGuest({
  label,
  checked,
  onCheckedChange,
  disabled,
}: NonNullable<VikingAirGuestCardProps['copyToNextGuest']> & { disabled: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        size="sm"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange?.(next === true)}
      />
      <label htmlFor={id} className="text-body-sm text-ink">
        {label}
      </label>
    </div>
  );
}
