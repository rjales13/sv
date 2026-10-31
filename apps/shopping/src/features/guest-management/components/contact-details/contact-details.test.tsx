// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../../../test-setup.ts';
import { ContactDetails, type ContactDetailsProps } from './contact-details.tsx';

const contact: ContactDetailsProps['contact'] = {
  email: 'john371@outlook.com',
  phone: '(781) 283-10395',
  address: '45 PINECREST AVENUE, HARRISBURG, PA 1710, United States',
};

describe('ContactDetails — expanded (Default)', () => {
  it('lists email, phone and address under their labels', () => {
    render(<ContactDetails contact={contact} />);
    const terms = screen.getAllByRole('term').map((t) => t.textContent);
    const values = screen.getAllByRole('definition').map((d) => d.textContent);
    expect(terms).toEqual(['Email', 'Phone', 'Address']);
    expect(values).toEqual([contact.email, contact.phone, contact.address]);
  });

  it('titles the section "Contact details" and starts expanded', () => {
    render(<ContactDetails contact={contact} />);
    expect(screen.getByRole('button', { name: 'Contact details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('wires Edit through the sub-section title', () => {
    const onEdit = vi.fn();
    render(<ContactDetails contact={contact} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Contact details' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('ContactDetails — collapsed', () => {
  it('collapses from the title, hiding the fields and Edit', () => {
    const onExpandedChange = vi.fn();
    render(
      <ContactDetails contact={contact} onEdit={vi.fn()} onExpandedChange={onExpandedChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Contact details' }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(contact.email)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
  });

  it('respects a controlled collapsed state', () => {
    render(<ContactDetails contact={contact} expanded={false} />);
    expect(screen.getByRole('button', { name: 'Contact details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('term')).not.toBeInTheDocument();
  });
});

describe('ContactDetails — HTML forwarding', () => {
  it('exposes data-slot and merges className', () => {
    const { container } = render(<ContactDetails contact={contact} className="extra" />);
    expect(container.querySelector('[data-slot="contact-details"]')).toHaveClass('extra');
  });
});
