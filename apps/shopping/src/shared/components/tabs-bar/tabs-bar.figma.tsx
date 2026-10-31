import figma from '@figma/code-connect';
import { Tabs, TabsContent } from '@vikings/ui/components/tabs';
import { TabsBar } from './tabs-bar';

/*
  Code Connect for TabsBar (ShoppingApp_UX-VD, node 1667:80174).

  The frame carries no component properties — its four `Tabs` children are plain
  instances — so the tab set maps to the `tabs` array rather than to a variant axis,
  and a single connection covers it.

  The four children are separately connected to TabsTrigger by
  packages/ui/src/components/tabs.figma.tsx. That stays true: TabsBar renders exactly
  those triggers, so selecting the bar or one of its tabs in Dev Mode both land on
  real code.
*/

figma.connect(
  TabsBar,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=1667-80174',
  {
    example: () => (
      <Tabs defaultValue="itinerary">
        <TabsBar
          tabs={[
            { value: 'itinerary', label: 'Itinerary' },
            { value: 'stateroom', label: 'Staterooms' },
            { value: 'extensions', label: 'Extensions' },
            { value: 'air', label: 'Viking Air' },
          ]}
        />
        <TabsContent value="itinerary">Itinerary pane</TabsContent>
      </Tabs>
    ),
  },
);
