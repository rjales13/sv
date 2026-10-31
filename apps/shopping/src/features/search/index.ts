// Public surface of the U6 search feature. U7's composition root mounts
// `CruiseSearchController`, injecting the concrete provider (mock adapter) and the
// authenticated principal. The panel/results components and lib helpers stay internal to
// keep the feature's public API minimal — `SearchPanel` is exported only so Storybook can
// document it.

export { SearchPanel, type SearchPanelProps } from '@/features/search/components/search-panel';
export { CruiseSearchController, type CruiseSearchControllerProps } from './controller.tsx';
export {
  buildDefaultSearchPanelValues,
  EMPTY_SEARCH_PANEL_VALUES,
  type SailingWindow,
  SearchPanelSchema,
  type SearchPanelValues,
} from './lib/search-panel-schema.ts';
