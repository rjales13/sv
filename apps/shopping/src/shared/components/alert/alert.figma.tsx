import figma from '@figma/code-connect';
import { VAlert } from './alert';

/*
  Code Connect for VAlert (SA-DesignSystem, node 88:46).

  VAlert wraps the DS Alert primitive into a single, self-contained call:
  it selects the correct glyph from `variant`, so callers never need to
  hand-assemble Icon + AlertTitle + AlertDescription + AlertAction.

  Moved here from packages/ui/src/components/alert.figma.tsx so the
  Code Connect reflects what feature code actually uses — VAlert, not the
  raw DS primitive.
*/
figma.connect(
  VAlert,
  'https://www.figma.com/design/KHTdpBPOn3ZsJrNelheq5z/GLBModernization-DesignSystem?node-id=88-46',
  {
    props: {
      variant: figma.enum('Variant', {
        Success: 'success',
        Warning: 'warning',
        Error: 'error',
        Info: 'info',
      }),
      emphasis: figma.enum('Style', {
        Subtle: 'subtle',
        Inverted: 'inverted',
      }),
      showClose: figma.boolean('Show close'),
    },
    example: ({ variant, emphasis, showClose }) => (
      <VAlert
        variant={variant}
        emphasis={emphasis}
        title="Alert title"
        description="Alert message goes here."
        showClose={showClose}
      />
    ),
  },
);
