// @vitest-environment happy-dom

import { fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
// This test lives under `src/app/**` — the ONE FR6.2/ADR-006 exception — so it wires the
// REAL U5 mock adapter and the REAL U4 host/auth seams, exactly as production does. That is
// the point: the headline case proves the walking skeleton end-to-end (form -> controller ->
// mock adapter -> populated results) with nothing stubbed, in vitest, no browser.
import {
  MOCK_AGENT,
  MOCK_CONTACT,
  makeMockAgentProfileAdapter,
  makeMockContactProfileAdapter,
  makeMockCruiseSearchAdapter,
} from '@vikings/adapters';
import { createAuthProvider, createUrlHostShell } from '@vikings/platform';
import type * as React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import '../test-setup.ts';
import { resultsViewStore } from '@/features/search/lib/results-view-store.ts';
import { AppCompositionRoot } from './app-composition-root.tsx';

// The committed catavail fixtures sail Jan–Mar 2027 with nights of 7, 14 or 21. The FR1.1
// defaults (today's 2-month window, nights 0/0) therefore match nothing against the real
// data — so a populated proof MUST widen both the date window and the nights range. These
// constants make that intent explicit rather than magic numbers buried in the steps.
const FIXTURE_DATE_FROM = '2027-01-01';
const FIXTURE_DATE_TO = '2027-03-31';
const NIGHTS_FROM = 7;
const NIGHTS_TO = 21;

/** Waits until auth has resolved and the search form (the authenticated surface) is mounted. */
async function waitForAuthenticatedForm(): Promise<void> {
  await waitFor(() => expect(screen.getByTestId('search-form')).toBeInTheDocument());
}

// Sailing dates are an InputDate: a popover trigger over a single-month
// calendar, NOT a text input, so they cannot be driven with a change event.
// Navigation is computed from whatever month the calendar opens on rather than
// a fixed number of clicks, because the form's default window starts at the
// real today and would otherwise rot as time passes.
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Picks an ISO `yyyy-MM-dd` date through the calendar popover behind `triggerLabel`. */
function pickDate(triggerLabel: string, iso: string): void {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const caption = `${MONTHS[month - 1]} ${year}`;

  // InputDate opens the calendar from the input's `onFocus`, not a click (the calendar button
  // is the click path). `fireEvent.click` does not dispatch focus, so clicking here left the
  // popover closed and the dialog lookup below failed.
  fireEvent.focus(screen.getByLabelText(triggerLabel));
  const dialog = screen.getByRole('dialog', { name: 'Choose date' });

  // The grid's accessible name IS the month caption, so it is both the cursor
  // and the termination condition. The bound is a guard against a caption
  // format change silently turning this into an infinite loop.
  for (let hop = 0; hop < 60; hop += 1) {
    if (within(dialog).getByRole('grid').getAttribute('aria-label') === caption) break;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Go to the Next Month' }));
  }
  expect(within(dialog).getByRole('grid')).toHaveAttribute('aria-label', caption);

  // Day buttons are named "Friday, January 1st, 2027". Matching the ordinal
  // with a pattern avoids reimplementing ordinal formatting here, and naming
  // the month and year avoids hitting an adjacent month's outside day.
  const dayName = new RegExp(`${MONTHS[month - 1]} ${day}(?:st|nd|rd|th), ${year}`);
  fireEvent.click(within(dialog).getByRole('button', { name: dayName }));
}

/** Drives the form to a criteria set that matches the real fixtures (a populated search). */
function fillPopulatedCriteria(): void {
  // The panel opens expanded (VCX-10588 R1), so every criteria field is already mounted.
  // From is picked BEFORE To on purpose: R1 pushes To out two months whenever From moves,
  // so picking them the other way round would have the push overwrite the To we just set.
  pickDate('From', FIXTURE_DATE_FROM);
  pickDate('To', FIXTURE_DATE_TO);
  // Nights are plain number inputs (FR1.1 says quantity stepper — see
  // docs/handoff-notes.md section 5b). This drives whatever control ships; the
  // control-type question is tracked there, not asserted here.
  fireEvent.change(screen.getByLabelText('From nights'), {
    target: { value: String(NIGHTS_FROM) },
  });
  fireEvent.change(screen.getByLabelText('To nights'), {
    target: { value: String(NIGHTS_TO) },
  });
}

/**
 * Runs a search. SEARCH stays disabled until the panel holds input (VCX-10588 R7), so an empty
 * search bar gets a term first. The mock adapter does not consult the term (FR2.3), so it
 * changes no result.
 */
function submit(): void {
  const bar = screen.getByLabelText('Natural language search');
  if ((bar as HTMLInputElement).value === '') fireEvent.change(bar, { target: { value: 'nile' } });
  fireEvent.click(screen.getByTestId('search-submit'));
}

// Production mounts the composition root inside <BrowserRouter> (App.tsx) so routes resolve
// AFTER auth. MemoryRouter is the test-side equivalent.
function render(ui: React.ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

// The results-view store is a module singleton (it has to outlive the Search screen), so a
// filter switched in one test would otherwise still be on in the next.
beforeEach(() => {
  resultsViewStore.getState().resetView();
});

describe('AppCompositionRoot — walking-skeleton end-to-end proof', () => {
  it('authenticates, runs a populated search through the real mock adapter, and renders result cards', async () => {
    render(
      <AppCompositionRoot
        providers={{ cruiseSearch: makeMockCruiseSearchAdapter({ delayMs: 0 }) }}
      />,
    );

    await waitForAuthenticatedForm();
    fillPopulatedCriteria();
    submit();

    await waitFor(() => expect(screen.getByTestId('results-populated')).toBeInTheDocument());
    // The demonstrable proof: real fixture rows crossed the whole seam and rendered as cards.
    expect(screen.getAllByTestId('cruise-card').length).toBeGreaterThan(0);
  });

  it('reaches the empty state through the real adapter when the criteria match no sailings', async () => {
    // The FR1.1 defaults (nights 0/0, this year's window) plus a term match nothing against the
    // 2027 fixtures — the empty branch of the real adapter, not a stub.
    render(
      <AppCompositionRoot
        providers={{ cruiseSearch: makeMockCruiseSearchAdapter({ delayMs: 0 }) }}
      />,
    );

    await waitForAuthenticatedForm();
    submit();

    await waitFor(() => expect(screen.getByTestId('results-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('results-populated')).not.toBeInTheDocument();
  });

  it('reaches the error state through the real adapter error seam', async () => {
    // The provider is still the REAL U5 adapter, configured to exercise its error seam — the
    // composition root injects it exactly as it would inject the default provider (FR6.2).
    render(
      <AppCompositionRoot
        providers={{
          cruiseSearch: makeMockCruiseSearchAdapter({
            delayMs: 0,
            simulateError: {
              kind: 'upstream',
              message: 'The cruise search service is unavailable.',
            },
          }),
        }}
      />,
    );

    await waitForAuthenticatedForm();
    submit();

    await waitFor(() => expect(screen.getByTestId('results-error')).toBeInTheDocument());
    expect(screen.getByTestId('results-error')).toHaveTextContent(
      'The cruise search service is unavailable.',
    );
  });
});

describe('AppCompositionRoot — app environment (VCX-10478)', () => {
  it('runs as local when no environment is configured', async () => {
    render(<AppCompositionRoot />);

    await waitForAuthenticatedForm();
    expect(document.querySelector('[data-app-env]')).toHaveAttribute('data-app-env', 'local');
  });

  it('exposes the environment it was built for', async () => {
    render(<AppCompositionRoot environment="qas" />);

    await waitForAuthenticatedForm();
    expect(document.querySelector('[data-app-env]')).toHaveAttribute('data-app-env', 'qas');
  });
});

describe('AppCompositionRoot — NFR5 denied-auth gate', () => {
  it('renders the accessible denied state and never mounts the search form', async () => {
    render(
      <AppCompositionRoot
        authProvider={createAuthProvider({
          denied: { code: 403, reason: 'Your office is not entitled to cruise search.' },
        })}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('auth-denied')).toBeInTheDocument());
    expect(screen.getByTestId('auth-denied')).toHaveTextContent(
      'Your office is not entitled to cruise search.',
    );
    // The controller must never mount with an unauthenticated principal.
    expect(screen.queryByTestId('search-form')).not.toBeInTheDocument();
  });
});

// The CRM context the host shell loads at startup (VCX-10478, ADR-0019), from the launch the
// URL host adapter parses (VCX-10480). The agent is identity, so its failure stops the app; the
// contact is context, so its failure never blocks search (VCX-10474/10475) and leaves the
// contact unselected instead.
describe('AppCompositionRoot — CRM context', () => {
  const crmContact = () =>
    document.querySelector('[data-crm-contact]')?.getAttribute('data-crm-contact');

  /** The real URL host adapter, reading `search` as if CRM had launched the app with it. */
  const launchedWith = (search: string) =>
    createUrlHostShell({ search, storage: null, navigateTo: () => undefined });

  const CONTACT_LAUNCH = `?contactId=${MOCK_CONTACT.contactId.toUpperCase()}`;

  it('loads the launch contact into the session', async () => {
    render(<AppCompositionRoot hostShell={launchedWith(CONTACT_LAUNCH)} />);

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('selected');
  });

  // VCX-10479: with Easy Auth the principal is the real signed-in agent, so a band filled from it
  // showed every agent as their own main guest.
  it('shows the launch contact in the guest band, never the signed-in agent', async () => {
    render(
      <AppCompositionRoot
        hostShell={launchedWith(CONTACT_LAUNCH)}
        authProvider={createAuthProvider({ principal: { displayName: 'Signed-In Agent' } })}
      />,
    );

    await waitForAuthenticatedForm();
    expect(screen.getAllByText('John Smith Whitcombe').length).toBeGreaterThan(0);
    expect(screen.queryByText('Signed-In Agent')).not.toBeInTheDocument();
  });

  it('reads "Unselected Contact" in the guest band when the launch names no contact', async () => {
    render(<AppCompositionRoot />);

    await waitForAuthenticatedForm();
    expect(screen.getAllByText('Unselected Contact').length).toBeGreaterThan(0);
  });

  it('starts with no contact on a plain local run, which carries no launch', async () => {
    render(<AppCompositionRoot />);

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('unselected');
  });

  it('starts with no contact from the main menu, which sends only the user', async () => {
    render(<AppCompositionRoot hostShell={launchedWith(`?userId=${MOCK_AGENT.userId}`)} />);

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('unselected');
  });

  it('keeps search available when the launch contact id is malformed', async () => {
    render(<AppCompositionRoot hostShell={launchedWith('?contactId=not-a-guid')} />);

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('unselected');
  });

  it('keeps search available when the contact fails to load', async () => {
    render(
      <AppCompositionRoot
        hostShell={launchedWith(CONTACT_LAUNCH)}
        crmProviders={{
          contactProfile: makeMockContactProfileAdapter({
            delayMs: 0,
            simulateError: { kind: 'upstream' },
          }),
        }}
      />,
    );

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('unselected');
  });

  it('runs with the contact unselected when CRM has no such contact', async () => {
    render(
      <AppCompositionRoot
        hostShell={launchedWith(CONTACT_LAUNCH)}
        crmProviders={{
          contactProfile: makeMockContactProfileAdapter({ delayMs: 0, contacts: [] }),
        }}
      />,
    );

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('unselected');
  });

  // The agent is only real when it comes from the integration layer. The ports are the mocks
  // here so the test stays offline, but the source says `il`, which is what turns the check on.
  const AS_IF_FROM_IL = {
    crmSource: 'il',
    crmProviders: {
      agentProfile: makeMockAgentProfileAdapter({ delayMs: 0 }),
      contactProfile: makeMockContactProfileAdapter({ delayMs: 0 }),
    },
  } as const;

  it('shows the denied state when the launch was opened for a different user', async () => {
    render(
      <AppCompositionRoot
        {...AS_IF_FROM_IL}
        hostShell={launchedWith(`${CONTACT_LAUNCH}&userId=11111111-1111-1111-1111-111111111111`)}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('auth-denied')).toBeInTheDocument());
    expect(screen.getByTestId('auth-denied')).toHaveTextContent(
      'This CRM launch was opened for a different user.',
    );
    expect(screen.queryByTestId('search-form')).not.toBeInTheDocument();
  });

  // With mock CRM data the agent is a placeholder, while a real CRM launch carries the real
  // agent's userId. Comparing the two would deny every real launch on a deployed environment
  // that still runs on mocks, so the check only runs when the agent is real (the `il` source).
  it('does not check the launch user against the mock agent', async () => {
    render(
      <AppCompositionRoot
        hostShell={launchedWith(`${CONTACT_LAUNCH}&userId=59080737-cdec-ec11-bb3d-000d3a13af0c`)}
      />,
    );

    await waitForAuthenticatedForm();
    expect(crmContact()).toBe('selected');
  });

  it('shows the denied state, and never mounts search, when the CRM user is not confirmed', async () => {
    const deniedAgent = {
      getCurrentAgent: async () =>
        ({
          status: 'error',
          kind: 'denied',
          message: 'Your CRM user could not be confirmed.',
        }) as const,
    };
    render(<AppCompositionRoot crmProviders={{ agentProfile: deniedAgent }} />);

    await waitFor(() => expect(screen.getByTestId('auth-denied')).toBeInTheDocument());
    expect(screen.getByTestId('auth-denied')).toHaveTextContent(
      'Your CRM user could not be confirmed.',
    );
    expect(screen.queryByTestId('search-form')).not.toBeInTheDocument();
  });

  it('shows the startup error when the CRM user cannot be loaded', async () => {
    render(
      <AppCompositionRoot
        crmProviders={{
          agentProfile: makeMockAgentProfileAdapter({
            delayMs: 0,
            simulateError: { kind: 'upstream' },
          }),
        }}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('bootstrap-error')).toBeInTheDocument());
    expect(screen.queryByTestId('search-form')).not.toBeInTheDocument();
  });
});
