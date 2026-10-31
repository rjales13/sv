// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs, TabsContent } from '@vikings/ui/components/tabs';
import { describe, expect, it } from 'vitest';
import '../../../test-setup.ts';
import { TabsBar, type TabsBarItem } from './tabs-bar.tsx';

// TabsBar is the presentational section-navigation strip (ShoppingApp_UX-VD node
// 1667:80174). It owns no state: the parent <Tabs> holds the active value, so what
// matters here is that the tab set is driven by data rather than a variant, that the
// Radix tablist semantics survive (role, selection, disabled), and that activating a
// tab actually swaps the pane — the strip must be wired, not decorative.

const CRUISE_TABS: TabsBarItem[] = [
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'stateroom', label: 'Staterooms' },
  { value: 'extensions', label: 'Extensions' },
  { value: 'air', label: 'Viking Air' },
];

describe('TabsBar — rendering', () => {
  it('renders one tab per item, in order', () => {
    render(
      <Tabs defaultValue="itinerary">
        <TabsBar tabs={CRUISE_TABS} />
      </Tabs>,
    );

    const names = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(names).toEqual(['Itinerary', 'Staterooms', 'Extensions', 'Viking Air']);
  });

  it('exposes the strip as a tablist', () => {
    render(
      <Tabs defaultValue="itinerary">
        <TabsBar tabs={CRUISE_TABS} />
      </Tabs>,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  // The tab set is data, not a Figma variant — an empty list is a legitimate state
  // rather than something to guard against.
  it('renders an empty strip for an empty tab list', () => {
    render(
      <Tabs defaultValue="itinerary">
        <TabsBar tabs={[]} />
      </Tabs>,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});

describe('TabsBar — selection', () => {
  it('marks only the tab matching the parent value as selected', () => {
    render(
      <Tabs defaultValue="stateroom">
        <TabsBar tabs={CRUISE_TABS} />
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Staterooms' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Itinerary' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  // Proves the strip is wired to the real Radix machinery rather than rendering
  // look-alike buttons: activating a tab has to swap the pane.
  it('swaps the visible pane when another tab is activated', () => {
    render(
      <Tabs defaultValue="itinerary">
        <TabsBar tabs={CRUISE_TABS} />
        <TabsContent value="itinerary">Day by day</TabsContent>
        <TabsContent value="stateroom">Cabin grades</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('Day by day')).toBeInTheDocument();

    // Radix Tabs selects on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Staterooms' }));

    expect(screen.getByText('Cabin grades')).toBeInTheDocument();
    expect(screen.queryByText('Day by day')).not.toBeInTheDocument();
  });
});

describe('TabsBar — disabled', () => {
  it('disables a tab flagged disabled', () => {
    render(
      <Tabs defaultValue="itinerary">
        <TabsBar
          tabs={[...CRUISE_TABS.slice(0, 2), { value: 'air', label: 'Viking Air', disabled: true }]}
        />
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Viking Air' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Itinerary' })).not.toBeDisabled();
  });

  it('does not select a disabled tab when it is activated', () => {
    render(
      <Tabs defaultValue="itinerary">
        <TabsBar
          tabs={[...CRUISE_TABS.slice(0, 2), { value: 'air', label: 'Viking Air', disabled: true }]}
        />
      </Tabs>,
    );

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Viking Air' }));

    expect(screen.getByRole('tab', { name: 'Itinerary' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Viking Air' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});

describe('TabsBar — presentation', () => {
  it('applies a caller className to the bar', () => {
    const { container } = render(
      <Tabs defaultValue="itinerary">
        <TabsBar tabs={CRUISE_TABS} className="mt-4" />
      </Tabs>,
    );

    expect(container.querySelector('[data-slot="tabs-bar"]')).toHaveClass('mt-4');
  });
});
