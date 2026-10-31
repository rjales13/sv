import { type UIEvent, useCallback, useLayoutEffect, useRef } from 'react';
import { resultsViewStore } from './results-view-store.ts';

/**
 * Keeps the results scroll area where the agent left it across visits to the Search screen.
 *
 * Every scroll writes the offset to the results-view store; on return it is put back once,
 * the first time the results are on screen (`ready`). A layout effect, so it lands before the
 * first paint — a plain effect would show the top of the list for a frame and then jump.
 *
 * The offset is read with `getState()` rather than subscribed to: a subscription would
 * re-render the screen on every scroll event, for a number only this hook ever reads.
 */
export function useResultsScroll(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    if (ref.current) ref.current.scrollTop = resultsViewStore.getState().scrollTop;
  }, [ready]);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    resultsViewStore.getState().setView({ scrollTop: event.currentTarget.scrollTop });
  }, []);

  /** For a new result set, where the previous offset points at nothing in particular. */
  const scrollToTop = useCallback(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, []);

  return { ref, onScroll, scrollToTop };
}
