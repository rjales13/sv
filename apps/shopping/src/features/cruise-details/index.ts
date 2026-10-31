// Public surface of the cruise-details feature. The composition root mounts the container on
// the `/cruise/:cruiseId/:tab` route; the header/tabs/footer and the view-model stay internal
// so each tab's story composes through the route's <Outlet/> rather than re-wiring the shell.

export { CruiseDetailsContainer, type CruiseDetailsContainerProps } from './container.tsx';
