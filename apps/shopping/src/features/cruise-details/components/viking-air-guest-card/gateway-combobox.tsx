import { cn } from '@vikings/ui/lib/utils';
import { useEffect, useId, useRef, useState } from 'react';
import type { VikingAirGuestCardOption } from './viking-air-guest-card.tsx';

/*
  GatewayCombobox — a searchable airport-gateway picker for the Viking Air tab
  (ShoppingApp_UX-VD, node 2222:437447).

  Behaviour:
    - Typing in the input filters options by full label or IATA code (case-insensitive).
    - Clicking an option selects it, closes the dropdown and shows its label in the input.
    - Clicking outside closes the dropdown without clearing the selection.
    - The dropdown is scrollable and highlights the option under the cursor.
    - A selected label longer than the field width is truncated with an ellipsis.

  Accessibility: the input carries role="combobox", aria-expanded and aria-controls
  pointing at the listbox. Each option carries role="option" and aria-selected.
*/

export interface GatewayComboboxProps {
  id: string;
  value: string | undefined;
  options: VikingAirGuestCardOption[];
  disabled?: boolean;
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export function GatewayCombobox({
  id,
  value,
  options,
  disabled = false,
  placeholder = 'Select Gateway',
  onValueChange,
}: GatewayComboboxProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleFocus = () => {
    if (!disabled) {
      setOpen(true);
      // Clear query so the full list shows on re-focus, but preserve display value.
      setQuery('');
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleSelect = (option: VikingAirGuestCardOption) => {
    onValueChange(option.value);
    setOpen(false);
    setQuery('');
  };

  // The visible text: when open, show the live query; when closed, show the selected label.
  const displayValue = open ? query : selectedLabel;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-disabled={disabled || undefined}
        disabled={disabled}
        value={displayValue}
        placeholder={selectedLabel || placeholder}
        onChange={handleInput}
        onFocus={handleFocus}
        className={cn(
          // Matches the SelectTrigger skin used elsewhere in the card.
          'flex h-9 w-full truncate rounded-sm border border-input bg-surface px-3 py-2',
          'text-body-sm text-ink outline-none placeholder:text-ink-disabled',
          'focus-visible:ring-2 focus-visible:ring-fjord',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
      {open && filtered.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Gateway options"
          className={cn(
            'absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-sm border border-line',
            'bg-surface py-1 shadow-raised',
          )}
        >
          {filtered.map((option) => (
            <div
              key={option.value}
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              onPointerDown={(e) => {
                // Prevent blur from closing before the click registers.
                e.preventDefault();
                handleSelect(option);
              }}
              className={cn(
                'cursor-pointer truncate px-3 py-2 text-body-sm text-ink',
                'hover:bg-surface-muted',
                option.value === value && 'font-semibold text-fjord',
              )}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
