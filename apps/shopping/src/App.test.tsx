// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import './test-setup.ts';
import { App } from './App.tsx';
import { EMBED_BASENAME } from './host-shell/index.ts';

// `App` owns exactly one decision: is this document the mock Dynamics shell, or the app it
// frames? Both branches are covered here. The app's own behaviour is proven in
// app-composition-root.test.tsx; these assertions are about structure and delegation.

/** happy-dom honours pushState, which is all `isEmbedded()` reads. */
function visit(path: string) {
  globalThis.history.replaceState({}, '', path);
}

afterEach(() => {
  visit('/');
});

describe('App — the mock Dynamics shell (at /)', () => {
  it('renders the host chrome and frames the app rather than mounting it inline', () => {
    render(<App />);

    expect(screen.getByTestId('dynamics-top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('dynamics-nav')).toBeInTheDocument();

    // The app must arrive through a real iframe: that is what gives it its own document and
    // its own scroll, which is the whole point of mocking the host this way.
    const frame = screen.getByTestId('app-frame');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', EMBED_BASENAME);
  });

  it('passes its own query string on to the framed app, so a CRM launch URL works locally', () => {
    // Real D365 frames the app with record parameters. Opening the shell with the same query
    // string must hand them to the app, or the launch can only be tested inside CRM.
    visit('/?contactId=E4678A0D-DDD1-ED11-A7C7-000D3A11436B&typename=opportunity');
    render(<App />);

    expect(screen.getByTestId('app-frame')).toHaveAttribute(
      'src',
      `${EMBED_BASENAME}?contactId=E4678A0D-DDD1-ED11-A7C7-000D3A11436B&typename=opportunity`,
    );
  });

  it('collapses the sitemap from the command bar, the way the real host does', () => {
    render(<App />);

    const rail = screen.getByTestId('dynamics-nav');
    expect(rail).toHaveAttribute('data-state', 'expanded');

    // A hamburger drawn next to a collapsible rail has to actually collapse it, or it teaches
    // the agent the wrong thing about the product.
    fireEvent.click(screen.getByTestId('sitemap-toggle'));

    expect(screen.getByTestId('dynamics-nav')).toHaveAttribute('data-state', 'collapsed');
  });

  it('shows the Dynamics rail as present but inert — the host owns it', () => {
    render(<App />);

    const nav = screen.getByTestId('dynamics-nav');
    // Cruise Search is the rail item the shopping app corresponds to, shown selected.
    expect(within(nav).getByRole('button', { name: 'Cruise Search' })).toBeDisabled();
    expect(within(nav).getByRole('button', { name: 'Home' })).toBeDisabled();
  });

  it('does not mount the app itself in the shell document', () => {
    render(<App />);

    // If the shell ever grew the app inline, the iframe would stop being load-bearing and
    // the mock would stop proving anything about embedding.
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByTestId('search-form')).toBeNull();
  });
});

describe('App — the embedded app (at /embed)', () => {
  it('frames the app in a main landmark', () => {
    visit(EMBED_BASENAME);
    render(<App />);

    // A single `main` landmark is what lets assistive tech skip the chrome (NFR3).
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByTestId('dynamics-nav')).not.toBeInTheDocument();
  });

  it('mounts the composition root, so the authenticated surface appears', async () => {
    visit(EMBED_BASENAME);
    render(<App />);

    // The shell does no wiring itself; proving the search form arrives proves it delegated to
    // the composition root rather than reimplementing any of it.
    await waitFor(() => expect(screen.getByTestId('search-form')).toBeInTheDocument());
  });

  it('keeps the frame free of search knowledge until the root provides it', () => {
    visit(EMBED_BASENAME);
    const { container } = render(<App />);

    // Synchronously after mount, auth has not resolved: the frame exists but the search
    // surface does not. This is the seam — if it ever grew its own form, this would fail.
    expect(container.querySelector('main')).not.toBeNull();
    expect(screen.queryByTestId('search-form')).toBeNull();
  });

  it('resolves a deep link under the basename, so routes stay written unprefixed', async () => {
    // The whole reason for a basename: `cruiseTabPath` and every route still say
    // `/cruise/:cruiseId/:tab`, and react-router adds `/embed`.
    visit(`${EMBED_BASENAME}/cruise/SBK270101T/itinerary`);
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('cruise-details-loading')).toBeInTheDocument());
  });
});

// Direct mode is what a deployed environment framed by real D365 runs: the site root IS the
// app. CRM points its iframe at `/?contactId=…`, so a mock shell there would put fake D365
// chrome inside the real one and drop the parameters on the way to its inner iframe.
describe('App — direct mode (no mock shell)', () => {
  it('mounts the app at the site root instead of the mock shell', async () => {
    render(<App mode="direct" />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByTestId('dynamics-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-frame')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('search-form')).toBeInTheDocument());
  });

  it('keeps the launch parameters on the URL the app boots with', async () => {
    visit('/?contactId=E4678A0D-DDD1-ED11-A7C7-000D3A11436B');
    render(<App mode="direct" />);

    await waitFor(() => expect(screen.getByTestId('search-form')).toBeInTheDocument());
    expect(globalThis.location.search).toBe('?contactId=E4678A0D-DDD1-ED11-A7C7-000D3A11436B');
  });

  it('resolves a deep link at the root, without the /embed prefix', async () => {
    visit('/cruise/SBK270101T/itinerary');
    render(<App mode="direct" />);

    await waitFor(() => expect(screen.getByTestId('cruise-details-loading')).toBeInTheDocument());
  });

  it('still serves /embed, so a link already pointing there keeps working', async () => {
    visit(`${EMBED_BASENAME}/cruise/SBK270101T/itinerary`);
    render(<App mode="direct" />);

    await waitFor(() => expect(screen.getByTestId('cruise-details-loading')).toBeInTheDocument());
    expect(screen.queryByTestId('dynamics-nav')).not.toBeInTheDocument();
  });
});

describe('App — guest context', () => {
  it('shows the contact band on a cruise screen, not only on search', async () => {
    // It used to live in the search controller, so it vanished the moment an agent opened a
    // cruise — four of the seven surfaces had no contact context at all. The frames carry it
    // on every screen.
    visit(`${EMBED_BASENAME}/cruise/SBK270101T/itinerary`);
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Expand customer details' })).toBeInTheDocument(),
    );
  });
});
