// Public surface of the cruise-workspace feature: the app's own tab strip (VCX-10326).
// The composition root mounts it as chrome above the routed content, because it is present
// on every screen rather than belonging to any one route.

export { WorkspaceTabStrip } from './components/workspace-tab-strip.tsx';
