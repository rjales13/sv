import { TabsList, TabsTrigger } from '@vikings/ui/components/tabs';
import { cn } from '@vikings/ui/lib/utils';

/*
  TabsBar — the centred section-navigation strip (ShoppingApp_UX-VD, node 1667:80174).

  ⚠️ This is a presentational strip built on the design system's Radix tabs. It is NOT
  the cruise-details navigation: that is `CruiseDetailsTabs`, which renders NavLinks
  because ADR-0012 §4 puts the active inner tab in the URL and explicitly rejects
  component state for it. Both render the same four labels, so before wiring this into
  a route, read ADR-0012 — reaching for it there would silently drop deep links,
  reload survival and the per-tab Playwright entry points.

  Renders the list only, never the <Tabs> root. Radix resolves TabsContent through Root
  context, so a strip that owned its own Root could switch nothing outside itself; the
  caller holds the Root and the panes together.

  Figma draws four `Tabs` children directly in the bar with no tablist wrapper. TabsList
  is added regardless because role=tab is only meaningful inside role=tablist, which the
  Tabs molecule's own accessibility spec requires.
*/

export interface TabsBarItem {
  /** Pane id — matches the `value` on the corresponding TabsContent. */
  value: string;
  /** Visible pane name, e.g. "Itinerary". */
  label: string;
  /** Pane unavailable in this context: not focusable, skipped by arrow-key roving focus. */
  disabled?: boolean;
}

export interface TabsBarProps {
  /** Panes left to right. The count is data — Figma's bar carries no variant axis. */
  tabs: TabsBarItem[];
  className?: string;
}

export function TabsBar({ tabs, className }: TabsBarProps) {
  return (
    // overflow-clip mirrors the Figma frame: the bar crops rather than scrolls or wraps.
    <div data-slot="tabs-bar" className={cn('flex w-full overflow-clip', className)}>
      {/* w-full so the design system's hairline baseline spans the whole bar rather than
          only the centred tab group — the Tabs spec seats the tabs "over a bottom rail",
          which the Figma frame itself omits. */}
      <TabsList className="w-full justify-center">
        {tabs.map((tab) => (
          // `?? false` rather than passing through: exactOptionalPropertyTypes rejects an
          // explicit undefined on an optional prop.
          <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled ?? false}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
