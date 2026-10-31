// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { PanelFooter } from './panel-footer';

describe('PanelFooter', () => {
  // The primary CTA copy tracks the panel state: "Review Booking" while the agent is still
  // configuring (collapsed), "Book Now" once the breakdown is expanded for review.
  describe('primary CTA label', () => {
    it('reads "Book Now" on the expanded variants', () => {
      for (const variant of ['TA', 'direct'] as const) {
        const { unmount } = render(<PanelFooter variant={variant} />);
        expect(screen.getByRole('button', { name: /^book now$/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /review booking/i })).not.toBeInTheDocument();
        unmount();
      }
    });

    it('reads "Review Booking" on every collapsed variant', () => {
      const collapsed = [
        'TA-collapsed',
        'direct-collapsed',
        'recalculating',
        'zero',
        'disabled',
        'book-unavailable',
      ] as const;
      for (const variant of collapsed) {
        const { unmount } = render(<PanelFooter variant={variant} />);
        expect(screen.getByRole('button', { name: /review booking/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^book now$/i })).not.toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('TA variant', () => {
    it('renders gross total and commission total', () => {
      render(<PanelFooter variant="TA" grossTotal="$33,455.00" commTotal="$4,999.00" />);
      expect(screen.getByText('Gross total')).toBeInTheDocument();
      expect(screen.getByText('$33,455.00')).toBeInTheDocument();
      expect(screen.getByText('Comm total')).toBeInTheDocument();
      expect(screen.getByText('$4,999.00')).toBeInTheDocument();
    });

    it('does not render a BREAKDOWN toggle', () => {
      render(<PanelFooter variant="TA" />);
      expect(screen.queryByRole('button', { name: /^breakdown$/i })).not.toBeInTheDocument();
    });

    it('renders all three action buttons enabled', () => {
      render(<PanelFooter variant="TA" />);
      expect(screen.getByRole('button', { name: /save opportunity/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /save search/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /book now/i })).not.toBeDisabled();
    });
  });

  describe('TA-collapsed variant', () => {
    it('renders BREAKDOWN toggle', () => {
      render(<PanelFooter variant="TA-collapsed" />);
      expect(screen.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
    });

    it('renders gross total and commission total', () => {
      render(<PanelFooter variant="TA-collapsed" grossTotal="$33,455.00" commTotal="$4,999.00" />);
      expect(screen.getByText('Gross total')).toBeInTheDocument();
      expect(screen.getByText('Comm total')).toBeInTheDocument();
    });

    it('fires onBreakdownToggle when BREAKDOWN is clicked', () => {
      const handler = vi.fn();
      render(<PanelFooter variant="TA-collapsed" onBreakdownToggle={handler} />);
      fireEvent.click(screen.getByRole('button', { name: /^breakdown$/i }));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('renders all three action buttons enabled', () => {
      render(<PanelFooter variant="TA-collapsed" />);
      expect(screen.getByRole('button', { name: /save opportunity/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /save search/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /review booking/i })).not.toBeDisabled();
    });
  });

  describe('direct variant', () => {
    it('renders gross total without commission total', () => {
      render(<PanelFooter variant="direct" grossTotal="$33,455.00" />);
      expect(screen.getByText('Gross total')).toBeInTheDocument();
      expect(screen.queryByText('Comm total')).not.toBeInTheDocument();
    });

    it('does not render a BREAKDOWN toggle', () => {
      render(<PanelFooter variant="direct" />);
      expect(screen.queryByRole('button', { name: /^breakdown$/i })).not.toBeInTheDocument();
    });
  });

  describe('direct-collapsed variant', () => {
    it('renders BREAKDOWN toggle and gross total', () => {
      render(<PanelFooter variant="direct-collapsed" grossTotal="$33,455.00" />);
      expect(screen.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
      expect(screen.getByText('Gross total')).toBeInTheDocument();
      expect(screen.queryByText('Comm total')).not.toBeInTheDocument();
    });
  });

  describe('recalculating variant', () => {
    it('renders BREAKDOWN toggle and spinner', () => {
      render(<PanelFooter variant="recalculating" />);
      expect(screen.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders "Recalculating" text', () => {
      render(<PanelFooter variant="recalculating" />);
      expect(screen.getByText(/recalculating/i)).toBeInTheDocument();
    });

    // Figma Panel 02: all action buttons disabled while price recalculates
    it('disables all three action buttons', () => {
      render(<PanelFooter variant="recalculating" />);
      expect(screen.getByRole('button', { name: /save opportunity/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save search/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /review booking/i })).toBeDisabled();
    });
  });

  describe('zero variant', () => {
    it('renders BREAKDOWN toggle and $00.00 gross total', () => {
      render(<PanelFooter variant="zero" grossTotal="$00.00" />);
      expect(screen.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
      expect(screen.getByText('$00.00')).toBeInTheDocument();
    });
  });

  describe('disabled variant', () => {
    it('renders the info notice', () => {
      render(<PanelFooter variant="disabled" />);
      expect(screen.getByText(/associate a direct contact or ta to proceed/i)).toBeInTheDocument();
    });

    // Figma Panel 03: all action buttons disabled when no contact/TA is associated
    it('disables all three action buttons', () => {
      render(<PanelFooter variant="disabled" />);
      expect(screen.getByRole('button', { name: /save opportunity/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save search/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /review booking/i })).toBeDisabled();
    });
  });

  describe('book-unavailable variant', () => {
    // Figma Panel 04: booking is blocked (e.g. no cabin selected) but saves are allowed
    it('renders BREAKDOWN toggle and gross total', () => {
      render(<PanelFooter variant="book-unavailable" grossTotal="$33,455.00" />);
      expect(screen.getByRole('button', { name: /^breakdown$/i })).toBeInTheDocument();
      expect(screen.getByText('Gross total')).toBeInTheDocument();
    });

    it('keeps Save Opportunity and Save Search enabled', () => {
      render(<PanelFooter variant="book-unavailable" />);
      expect(screen.getByRole('button', { name: /save opportunity/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /save search/i })).not.toBeDisabled();
    });

    it('disables the primary CTA (Review Booking while collapsed)', () => {
      render(<PanelFooter variant="book-unavailable" />);
      expect(screen.getByRole('button', { name: /review booking/i })).toBeDisabled();
    });

    it('does not render the info notice', () => {
      render(<PanelFooter variant="book-unavailable" />);
      expect(
        screen.queryByText(/associate a direct contact or ta to proceed/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('action button callbacks', () => {
    it('fires onSaveOpportunity', () => {
      const handler = vi.fn();
      render(<PanelFooter variant="TA" onSaveOpportunity={handler} />);
      fireEvent.click(screen.getByRole('button', { name: /save opportunity/i }));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('fires onSaveSearch', () => {
      const handler = vi.fn();
      render(<PanelFooter variant="TA" onSaveSearch={handler} />);
      fireEvent.click(screen.getByRole('button', { name: /save search/i }));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('fires onBookNow', () => {
      const handler = vi.fn();
      render(<PanelFooter variant="TA" onBookNow={handler} />);
      fireEvent.click(screen.getByRole('button', { name: /book now/i }));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not fire onBookNow when disabled variant', () => {
      const handler = vi.fn();
      render(<PanelFooter variant="disabled" onBookNow={handler} />);
      fireEvent.click(screen.getByRole('button', { name: /review booking/i }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire onBookNow when book-unavailable variant', () => {
      const handler = vi.fn();
      render(<PanelFooter variant="book-unavailable" onBookNow={handler} />);
      fireEvent.click(screen.getByRole('button', { name: /review booking/i }));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
