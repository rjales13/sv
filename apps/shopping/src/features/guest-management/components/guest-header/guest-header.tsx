import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { useState } from 'react';

/*
  GuestHeader — a guest section's 42px title bar (ShoppingApp_UX-VD, node 1282:155078).
    collapse / expanded → `expanded` (controlled, or uncontrolled starting collapsed)
    `button` boolean    → the Add Guest button, rendered when `onAddGuest` is given

  Code connections used:
    Icon IconActionAdd16          Add Guest glyph — drawn 14×14 in Figma, so size={14}
    Icon IconNavigationExpandLess collapsed chevron
    Icon IconNavigationExpandMore expanded chevron

  Figma draws both chevrons rotated 180°, so collapsed points down and expanded points
  up; the connected glyphs are kept with the rotation, as in VikingAirGuestCard.
*/

export interface GuestHeaderProps {
  /** e.g. "Guest 1". */
  title: string;
  /** Controlled expanded state. Omit to let the header manage it (starts collapsed). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Shows the Add Guest button (Figma's `button` property) and handles it. */
  onAddGuest?: () => void;
  /** Greys Add Guest out and blocks it (the Guest-Sidebar Disabled state). */
  addGuestDisabled?: boolean;
  className?: string;
}

export function GuestHeader({
  title,
  expanded: expandedProp,
  onExpandedChange,
  onAddGuest,
  addGuestDisabled = false,
  className,
}: GuestHeaderProps) {
  const [expandedState, setExpandedState] = useState(false);
  const expanded = expandedProp ?? expandedState;

  const toggle = () => {
    setExpandedState(!expanded);
    onExpandedChange?.(!expanded);
  };

  return (
    <div
      data-slot="guest-header"
      className={cn(
        'flex h-[42px] w-[340px] items-center justify-between border-t border-line bg-selected px-3 py-2',
        className,
      )}
    >
      <p className="text-title-md font-semibold whitespace-nowrap text-fjord">{title}</p>
      <div className="flex items-center gap-0.5">
        {onAddGuest && (
          <button
            type="button"
            onClick={onAddGuest}
            disabled={addGuestDisabled}
            className="flex h-6 items-center gap-1 rounded-xs bg-surface px-1.5 py-1 text-label-sm font-semibold whitespace-nowrap text-fjord outline-none focus-visible:ring-2 focus-visible:ring-fjord disabled:bg-surface-hover disabled:text-ink-disabled"
          >
            <Icon name="IconActionAdd16" size={14} tone="current" aria-hidden />
            Add Guest
          </button>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
          onClick={toggle}
          className="flex size-6 items-center justify-center rounded-xs text-fjord outline-none focus-visible:ring-2 focus-visible:ring-fjord"
        >
          {expanded ? (
            <Icon
              name="IconNavigationExpandMore"
              size={24}
              tone="current"
              className="rotate-180"
              data-icon="IconNavigationExpandMore"
            />
          ) : (
            <Icon
              name="IconNavigationExpandLess"
              size={24}
              tone="current"
              className="rotate-180"
              data-icon="IconNavigationExpandLess"
            />
          )}
        </button>
      </div>
    </div>
  );
}
