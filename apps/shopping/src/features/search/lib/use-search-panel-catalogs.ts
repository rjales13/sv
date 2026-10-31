import type { PrincipalRef, SearchCatalogs } from '@vikings/contracts';
import { useMemo } from 'react';
import { useSearchCatalogs } from '../../../app/data/use-search-catalogs.ts';
import {
  EMPTY_SEARCH_PANEL_OPTIONS,
  type SearchPanelOptions,
  toSearchPanelOptions,
} from './search-panel-options.ts';

export interface SearchPanelCatalogs {
  /** What the panel's controls offer — the empty set until the catalogs arrive. */
  options: SearchPanelOptions;
  /** The catalogs themselves, once loaded; the search needs them to expand products. */
  catalogs: SearchCatalogs | undefined;
  /** Set when the lists could not be loaded, for the agent to read. */
  errorMessage: string | undefined;
}

/** Shown when the port answered with no catalogs, or Query itself rejected. */
const NO_LISTS = 'The search lists could not be loaded.';

/**
 * The search form's lists (VCX-10507): the CRM's catalogs, read through the port and mapped
 * onto what the panel renders.
 *
 * A failure does not block the form. The agent sees why the lists are empty and can still run
 * an unnarrowed search — better than a form that refuses to work over a list it can live
 * without.
 */
export function useSearchPanelCatalogs(principal: PrincipalRef): SearchPanelCatalogs {
  const query = useSearchCatalogs(principal);
  const result = query.data;
  const catalogs = result?.status === 'ok' ? result.catalogs : undefined;

  const options = useMemo(
    () => (catalogs === undefined ? EMPTY_SEARCH_PANEL_OPTIONS : toSearchPanelOptions(catalogs)),
    [catalogs],
  );

  let errorMessage: string | undefined;
  if (query.isError || result?.status === 'empty') errorMessage = NO_LISTS;
  else if (result?.status === 'error') errorMessage = result.message;

  return { options, catalogs, errorMessage };
}
