import { CustomerCard } from '@vikings/ui/components/customer-card';
import type { CrmContact } from '../app/session/load-crm-context.ts';

// The contact/guest identity band.
//
// It moved here from the search controller because the approved frames carry it on EVERY
// screen, and owning it in one feature meant it vanished the moment an agent opened a cruise
// — four of the seven surfaces had no contact context at all.
//
// Pre-populated and non-interactive, per the epic's guest-management boundary (VCX-10322):
// customer management is out of scope, so its controls do not change WHO the guests are.
// Per-guest PRODUCT choices (Viking Air gateways, travel protection) stay live and belong to
// their own tabs.
//
// It shows the contact the CRM launch named (the session's, ADR-0019) — never the signed-in
// principal. It was once filled from the principal as a stand-in, which showed every agent as
// their own main guest as soon as Easy Auth signed real agents in (VCX-10479).
//
// ⚠️ Only the name, number, email and address come from CRM. The other details, the status
// badge and the second guest are stand-ins: the contact port does not carry them yet, and
// `context/` has no spec for them (see the kickoff's open items).

const UNSELECTED = 'Unselected Contact';

const SECOND_GUEST = {
  id: 'G2',
  name: 'Ms. Mary Stone Davis',
  customerId: '100838606002',
  isMain: false,
};

const STAND_IN_DETAILS = {
  phone: '+1 (555) 000-0000',
  age: 'N/A',
  osVouchers: '$0',
  pastTravels: '0 cruises',
  tppEligible: 'Unknown',
  localTime: '—',
  flags: '',
  lastAir: 'N/A',
};

export function GuestContextBand({ contact }: { contact: CrmContact }) {
  if (contact.status === 'unselected') {
    return (
      <CustomerCard
        customer={{
          name: UNSELECTED,
          id: '—',
          initials: '—',
          status: { label: 'No contact', variant: 'neutral' },
        }}
        contactDetails={{ ...STAND_IN_DETAILS, email: 'N/A', address: 'N/A' }}
        guests={[]}
      />
    );
  }

  const { contact: profile } = contact;
  // CRM may hold nothing but the id for a contact, so every shown value has a fallback.
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || UNSELECTED;
  const customerId = profile.customerNumber ?? profile.contactId;
  const address = profile.address;
  const addressLine =
    [address?.street1, address?.city, address?.stateOrProvince].filter(Boolean).join(', ') || 'N/A';

  return (
    <CustomerCard
      customer={{
        name,
        id: customerId,
        initials: initialsOf(name),
        status: { label: 'Past Guest', variant: 'info' },
      }}
      contactDetails={{ ...STAND_IN_DETAILS, email: profile.email ?? 'N/A', address: addressLine }}
      guests={[{ id: 'G1', name, customerId, isMain: true }, SECOND_GUEST]}
    />
  );
}

/** Two-letter monogram for the avatar; the DS card has no fallback of its own. */
function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
