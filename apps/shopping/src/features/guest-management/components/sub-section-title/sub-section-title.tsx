import { Icon } from '@vikings/ui/components/icon';
import { cn } from '@vikings/ui/lib/utils';
import { useState } from 'react';

/*
  SubSectionTitle — a collapsible overline heading inside a guest panel, e.g.
  "CONTACT DETAILS" (ShoppingApp_UX-VD, node 1282:155103).
    expanded / collapsed → `expanded` (controlled, or uncontrolled starting expanded)
    `Button` boolean     → the Edit button, rendered when `onEdit` is given (expanded only)

  Code connections used:
    Icon IconNavigationExpandLess16  expanded chevron
    Icon IconNavigationChevronLeft16 collapsed chevron
    Icon IconActionEdit16            Edit glyph — drawn 14×14 in Figma, so size={14}

  Figma draws both chevrons rotated 180° (expanded points down, collapsed points
  right); the connected glyphs are kept with the rotation, as in GuestHeader.
*/

export interface SubSectionTitleProps {
  /** Section name, e.g. "Contact details" — rendered as an uppercase overline. */
  title: string;
  /** Controlled expanded state. Omit to let the title manage it (starts expanded). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Shows the Edit button (Figma's `Button` property) and handles it. */
  onEdit?: () => void;
  className?: string;
}

export function SubSectionTitle({
  title,
  expanded: expandedProp,
  onExpandedChange,
  onEdit,
  className,
}: SubSectionTitleProps) {
  const [expandedState, setExpandedState] = useState(true);
  const expanded = expandedProp ?? expandedState;

  const toggle = () => {
    setExpandedState(!expanded);
    onExpandedChange?.(!expanded);
  };

  const chevron = expanded ? 'IconNavigationExpandLess16' : 'IconNavigationChevronLeft16';

  return (
    <div
      data-slot="sub-section-title"
      className={cn(
        'flex w-[306px] items-center justify-between border-t border-line py-2',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={toggle}
        className="flex items-center gap-1 rounded-xs pl-1 text-ink-tertiary outline-none focus-visible:ring-2 focus-visible:ring-fjord"
      >
        <Icon
          name={chevron}
          size={16}
          tone="current"
          className="rotate-180"
          data-icon={chevron}
          aria-hidden
        />
        <span className="text-overline font-semibold whitespace-nowrap uppercase tracking-[0.08em]">
          {title}
        </span>
      </button>
      {expanded && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
          className="flex h-6 items-center gap-1 rounded-xs px-1.5 py-1 text-label-sm font-semibold whitespace-nowrap text-fjord outline-none focus-visible:ring-2 focus-visible:ring-fjord"
        >
          <Icon name="IconActionEdit16" size={14} tone="current" aria-hidden />
          Edit
        </button>
      )}
    </div>
  );
}
