import { Input } from '@vikings/ui/components/input';
import * as React from 'react';

/*
  NightsInput — the From (Nights) / To (Nights) field of the search panel (VCX-10586 R9–R12).

  The form keeps nights as a number where 0 means "no bound", so 0 shows as an empty field
  (R9) rather than a literal 0 the agent would have to delete. Only digits are kept (R11): a
  text field, not `type="number"`, because the browser's number input still lets `e`, `-` and
  `.` in and reports them as an empty value instead of refusing them.

  `min` is checked when the agent LEAVES the field, not per keystroke (R12): typing 12 against
  a From of 10 passes through 1, and refusing that keystroke would make 12 impossible to type.
  A value below `min` reverts to what the field held when the agent entered it.
*/
export interface NightsInputProps {
  id: string;
  'aria-label': string;
  value: number;
  onValueChange: (nights: number) => void;
  /** The lowest value kept on blur; 0 (the default) applies no floor. */
  min?: number;
  /** Called after a value below `min` was reverted, so the owner can say why. */
  onBelowMin?: () => void;
  invalid?: boolean;
}

export function NightsInput({
  value,
  onValueChange,
  min = 0,
  onBelowMin,
  invalid = false,
  ...rest
}: NightsInputProps) {
  // What a refused entry reverts to.
  const valueOnFocus = React.useRef(value);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value === 0 ? '' : String(value)}
      onFocus={() => {
        valueOnFocus.current = value;
      }}
      onChange={(event) => onValueChange(Number(event.target.value.replace(/\D/g, '')))}
      onBlur={() => {
        if (value === 0 || value >= min) return;
        onValueChange(valueOnFocus.current);
        onBelowMin?.();
      }}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
