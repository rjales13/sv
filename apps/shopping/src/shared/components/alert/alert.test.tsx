// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../test-setup.ts';
import type { VAlertVariant } from './alert.tsx';
import { VAlert } from './alert.tsx';

// VAlert collapses the hand-composed DS Alert into one call. What matters is
// that it still announces itself to assistive tech, that the status colour is
// never the only carrier of meaning, and that dismissal stays keyboard-usable.

const ALL_VARIANTS: VAlertVariant[] = ['info', 'success', 'warning', 'error'];

describe('VAlert — content', () => {
  it('renders the title and the description', () => {
    render(<VAlert title="Search failed" description="Check your connection." />);
    expect(screen.getByText('Search failed')).toBeInTheDocument();
    expect(screen.getByText('Check your connection.')).toBeInTheDocument();
  });

  it('renders a description-only banner when no title is given', () => {
    render(<VAlert description="Changes saved successfully." />);
    expect(screen.getByText('Changes saved successfully.')).toBeInTheDocument();
  });

  // Body copy often carries a link, so the description has to accept nodes.
  it('accepts rich nodes in the description', () => {
    render(
      <VAlert
        title="Session"
        description={
          <span>
            See <a href="/help">the guide</a>.
          </span>
        }
      />,
    );
    expect(screen.getByRole('link', { name: 'the guide' })).toBeInTheDocument();
  });
});

describe('VAlert — variant and emphasis', () => {
  it('defaults to the info variant at subtle emphasis', () => {
    const { container } = render(<VAlert title="Hi" />);
    const alert = container.querySelector('[data-slot="alert"]');
    expect(alert).toHaveAttribute('data-variant', 'info');
    expect(alert).toHaveAttribute('data-emphasis', 'subtle');
  });

  it.each(ALL_VARIANTS)('exposes the %s variant', (variant) => {
    const { container } = render(<VAlert variant={variant} title="Hi" />);
    expect(container.querySelector('[data-slot="alert"]')).toHaveAttribute('data-variant', variant);
  });

  it('carries inverted emphasis through to the banner', () => {
    const { container } = render(<VAlert emphasis="inverted" title="Hi" />);
    expect(container.querySelector('[data-slot="alert"]')).toHaveAttribute(
      'data-emphasis',
      'inverted',
    );
  });
});

describe('VAlert — icon', () => {
  it('renders a glyph for every variant without being asked', () => {
    for (const variant of ALL_VARIANTS) {
      const { container, unmount } = render(<VAlert variant={variant} title="Hi" />);
      expect(container.querySelector('[data-slot="v-alert-icon"]')).toBeInTheDocument();
      unmount();
    }
  });

  // The default glyph is derived from the variant, so a caller overriding it
  // must actually win rather than being merged with the default.
  it('uses the icon the caller names instead of the variant default', () => {
    const { container } = render(
      <VAlert variant="success" icon="IconTravelAnchor" title="Docked" />,
    );
    const icon = container.querySelector('[data-slot="v-alert-icon"]');
    expect(icon).toHaveAttribute('data-icon', 'IconTravelAnchor');
  });

  it('falls back to the variant glyph when no icon is named', () => {
    const { container } = render(<VAlert variant="error" title="Failed" />);
    expect(container.querySelector('[data-slot="v-alert-icon"]')).toHaveAttribute(
      'data-icon',
      'IconStatusError',
    );
  });

  // Colour alone must not carry the status (WCAG 1.4.1); the glyph is
  // decorative, so the variant is named in text for assistive tech instead.
  it('names the status for assistive tech rather than relying on colour', () => {
    render(<VAlert variant="warning" title="Hold expiring" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows the glyph by default', () => {
    const { container } = render(<VAlert title="Hi" />);
    expect(container.querySelector('[data-slot="v-alert-icon"]')).toBeInTheDocument();
  });

  it('hides the glyph when showIcon is false', () => {
    const { container } = render(<VAlert title="Hi" showIcon={false} />);
    expect(container.querySelector('[data-slot="v-alert-icon"]')).not.toBeInTheDocument();
  });

  // Dropping the glyph must not drop the only non-colour cue with it.
  it('still names the status when the glyph is hidden', () => {
    render(<VAlert variant="error" title="Failed" showIcon={false} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});

describe('VAlert — dismissal', () => {
  it('renders no dismiss button by default', () => {
    render(<VAlert title="Hi" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a dismiss button when a handler is supplied', () => {
    render(<VAlert title="Hi" onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls the handler on click', () => {
    const onDismiss = vi.fn();
    render(<VAlert title="Hi" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  // The banner can appear unprompted, so dismissal must not require a mouse.
  // A native <button> is Enter/Space-activatable for free — happy-dom will not
  // synthesise that from a key event, so assert the element type and that it
  // takes focus, which is what actually earns the behaviour.
  it('is reachable and activatable from the keyboard', () => {
    render(<VAlert title="Hi" onDismiss={() => {}} />);
    const dismiss = screen.getByRole('button', { name: /dismiss/i });
    expect(dismiss.tagName).toBe('BUTTON');
    expect(dismiss).not.toHaveAttribute('disabled');
    dismiss.focus();
    expect(dismiss).toHaveFocus();
  });

  it('lets the caller name the dismiss button', () => {
    render(<VAlert title="Hi" onDismiss={() => {}} dismissLabel="Dismiss hold warning" />);
    expect(screen.getByRole('button', { name: 'Dismiss hold warning' })).toBeInTheDocument();
  });

  // showClose defaults to "whatever onDismiss implies", so supplying a handler
  // is enough, but either answer can be forced explicitly.
  it('hides the dismiss button when showClose is false despite a handler', () => {
    render(<VAlert title="Hi" onDismiss={() => {}} showClose={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the dismiss button when showClose is true without a handler', () => {
    render(<VAlert title="Hi" showClose />);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('does not throw when a handler-less dismiss button is clicked', () => {
    render(<VAlert title="Hi" showClose />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))).not.toThrow();
  });
});

describe('VAlert — accessibility and presentation', () => {
  it('announces itself as a status', () => {
    render(<VAlert title="Saved" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies a caller className to the banner', () => {
    const { container } = render(<VAlert title="Hi" className="mt-4" />);
    expect(container.querySelector('[data-slot="alert"]')).toHaveClass('mt-4');
  });
});
