// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { SubSectionTitle } from './sub-section-title.tsx';

describe('SubSectionTitle — expansion', () => {
  it('starts expanded, as Figma defaults, with the title as the toggle', () => {
    render(<SubSectionTitle title="Contact details" />);
    expect(screen.getByRole('button', { name: 'Contact details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapses and reports the change', () => {
    const onExpandedChange = vi.fn();
    render(<SubSectionTitle title="Contact details" onExpandedChange={onExpandedChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Contact details' }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Contact details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('draws the Figma chevron for each state', () => {
    const { container, rerender } = render(<SubSectionTitle title="Contact details" expanded />);
    expect(container.querySelector('[data-icon="IconNavigationExpandLess16"]')).toBeTruthy();
    rerender(<SubSectionTitle title="Contact details" expanded={false} />);
    expect(container.querySelector('[data-icon="IconNavigationChevronLeft16"]')).toBeTruthy();
  });
});

describe('SubSectionTitle — Edit', () => {
  it('shows Edit when a handler is given and fires it', () => {
    const onEdit = vi.fn();
    render(<SubSectionTitle title="Contact details" onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Contact details' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('hides Edit without a handler', () => {
    render(<SubSectionTitle title="Contact details" />);
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
  });

  it('hides Edit while collapsed, as in Figma', () => {
    render(<SubSectionTitle title="Contact details" expanded={false} onEdit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
  });
});

describe('SubSectionTitle — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = render(<SubSectionTitle title="Contact details" className="extra" />);
    expect(container.querySelector('[data-slot="sub-section-title"]')).toHaveClass('extra');
  });
});
