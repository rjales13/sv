// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { MOCK_CONTACT } from '@vikings/adapters';
import { describe, expect, it } from 'vitest';
import '../test-setup.ts';
import { GuestContextBand } from './guest-context-band.tsx';

// The contact band shows WHO THE CALL IS ABOUT: the contact the CRM launch named. It used to be
// filled from the signed-in principal, a stand-in from before the CRM context existed — harmless
// while the principal was a mock, but once Easy Auth signed real agents in (VCX-10479) every
// agent saw themselves as the main guest.

describe('GuestContextBand', () => {
  it('shows the launch contact by name and customer number', () => {
    render(<GuestContextBand contact={{ status: 'selected', contact: MOCK_CONTACT }} />);

    expect(screen.getAllByText('John Smith Whitcombe').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100838606001/).length).toBeGreaterThan(0);
  });

  it('falls back to the contact id when CRM has no customer number', () => {
    render(
      <GuestContextBand
        contact={{ status: 'selected', contact: { contactId: 'c-42', firstName: 'Ann' } }}
      />,
    );

    expect(screen.getAllByText('Ann').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/c-42/).length).toBeGreaterThan(0);
  });

  it.each(['no-contact-id', 'not-found', 'failed'] as const)(
    'reads "Unselected Contact" when there is no launch contact (%s)',
    (reason) => {
      render(<GuestContextBand contact={{ status: 'unselected', reason }} />);

      expect(screen.getAllByText('Unselected Contact').length).toBeGreaterThan(0);
    },
  );
});
