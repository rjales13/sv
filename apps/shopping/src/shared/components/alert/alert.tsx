import { Alert, AlertAction, AlertDescription, AlertTitle } from '@vas/ui/components/alert';
import { Icon, type IconName } from '@vas/ui/components/icon';
import { cn } from '@vas/ui/lib/utils';
import type * as React from 'react';

/*
  VAlert — the VA status banner as one call.

  The DS Alert is a primitive set: every call site hand-assembles Alert + Icon +
  AlertTitle + AlertDescription + AlertAction, and has to remember the icon's
  size, tone and aria-hidden itself. VAlert takes the status as a prop and picks
  the glyph, so the four banners cannot drift apart across the app.

  Colour is the semantic `variant`, not a free-form colour: the DS pairs each
  status with a tint, ring and text colour that are known to clear WCAG AA.
  `icon` overrides only the glyph, never the colour.

  No Code Connect file on purpose — the DS Alert already owns Figma node 88:46
  (packages/ui/src/components/alert.figma.tsx). A second mapping on the same node
  would fight it.
*/

export type VAlertVariant = 'info' | 'success' | 'warning' | 'error';
export type VAlertEmphasis = 'subtle' | 'inverted';

/*
  Each status owns a glyph and a word. The glyph is decorative — the DS Icon
  renders aria-hidden — so the word is what keeps colour from being the only
  carrier of meaning (WCAG 1.4.1).
*/
const VARIANT: Record<VAlertVariant, { icon: IconName; label: string }> = {
  info: { icon: 'IconStatusInfo', label: 'Information' },
  success: { icon: 'IconStatusCheckCircle', label: 'Success' },
  warning: { icon: 'IconStatusWarning', label: 'Warning' },
  error: { icon: 'IconStatusError', label: 'Error' },
};

export interface VAlertProps {
  /** Status colour. Defaults to "info". */
  variant?: VAlertVariant;
  /** "subtle" tint + ring, or "inverted" solid fill with white content. */
  emphasis?: VAlertEmphasis;
  /** Overrides the variant's default glyph. The status colour is unaffected. */
  icon?: IconName;
  /** Show the status glyph. Defaults to true. */
  showIcon?: boolean;
  /** Bold heading. Omit for a single-line banner. */
  title?: string;
  /** Body copy. Takes nodes so the message can carry a link. */
  description?: React.ReactNode;
  /** Show the dismiss button. Defaults to true when `onDismiss` is supplied. */
  showClose?: boolean;
  /** Called when the dismiss button is pressed. */
  onDismiss?: () => void;
  /** Accessible name for the dismiss button. */
  dismissLabel?: string;
  className?: string;
}

export function VAlert({
  variant = 'info',
  emphasis = 'subtle',
  icon,
  showIcon = true,
  title,
  description,
  showClose,
  onDismiss,
  dismissLabel = 'Dismiss alert',
  className,
}: VAlertProps) {
  const { icon: variantIcon, label } = VARIANT[variant];
  const glyph = icon ?? variantIcon;
  // Supplying a handler is the usual way to ask for the button; showClose
  // overrides that either way for callers driving dismissal from elsewhere.
  const withClose = showClose ?? Boolean(onDismiss);

  return (
    <Alert
      variant={variant}
      emphasis={emphasis}
      data-variant={variant}
      className={cn(
        // Without a heading the single line reads better centred against the glyph.
        !title && 'items-center',
        // The glyph owns grid column 1; with no glyph that column collapses to
        // zero and only its gap is left, which would indent the text.
        !showIcon && 'gap-x-0',
        className,
      )}
    >
      {showIcon ? (
        <Icon name={glyph} size={24} tone="current" data-slot="v-alert-icon" data-icon={glyph} />
      ) : null}
      <span className="sr-only">{label}</span>

      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {description ? <AlertDescription>{description}</AlertDescription> : null}

      {withClose ? (
        <AlertAction className={!title ? '!top-1/2 !-translate-y-1/2' : undefined}>
          <button
            type="button"
            aria-label={dismissLabel}
            onClick={onDismiss}
            className="cursor-pointer"
          >
            <Icon name="IconNavigationClose16" size={16} />
          </button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
