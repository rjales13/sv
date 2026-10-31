import figma from '@figma/code-connect';
import { FiltersBar } from './filters-bar';

/*
  Code Connect for Search Filters Bar (ShoppingApp_UX-VD, node 2625:225862).
  No Figma component properties — the component is a static frame. The example
  shows representative values for each prop; replace with your real data source.
*/
figma.connect(
  FiltersBar,
  'https://www.figma.com/design/savWyo2gT0Xz4lqin0fJ7r/ShoppingApp_UX-VD?node-id=2625-225862',
  {
    example: () => (
      <FiltersBar
        resultCount={8}
        filterValue=""
        filterOptions={[
          { value: 'standard', label: 'Standard' },
          { value: 'deluxe', label: 'Deluxe' },
          { value: 'penthouse', label: 'Penthouse' },
          { value: 'explorer', label: 'Explorer' },
        ]}
        onFilterChange={() => {}}
        showSoldOutCruises={false}
        onShowSoldOutCruisesChange={() => {}}
        showSoldOutPackages={false}
        onShowSoldOutPackagesChange={() => {}}
        showSoldOutHotels={false}
        onShowSoldOutHotelsChange={() => {}}
        sortValue="embarkationAsc"
        sortOptions={[
          { value: 'embarkationAsc', label: 'Embarkation Date (Ascending)' },
          { value: 'embarkationDesc', label: 'Embarkation Date (Descending)' },
          { value: 'priceAsc', label: 'Price (Low to High)' },
          { value: 'priceDesc', label: 'Price (High to Low)' },
        ]}
        onSortChange={() => {}}
      />
    ),
  },
);
