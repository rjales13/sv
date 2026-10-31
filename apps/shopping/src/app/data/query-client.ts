import { QueryClient } from '@tanstack/react-query';

/**
 * The app's QueryClient.
 *
 * A factory rather than a module-level singleton so each test gets an isolated cache — a
 * shared client leaks results between tests and produces passes that depend on run order.
 *
 * The two non-default options are load-bearing for the FR4 states rather than preferences:
 *
 *  - `retry: false` — an unexpected failure must reach the error state immediately. Retrying
 *    leaves the agent watching a spinner for seconds before being told anything went wrong,
 *    and the port already models *expected* failures as results, so a rejected promise here
 *    means something genuinely unexpected that a retry will not fix.
 *  - `refetchOnWindowFocus: false` — an agent alt-tabbing to Dynamics and back must not
 *    silently re-price the quote they are reading to a customer.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        // Cruise inventory moves, but not within the seconds an agent spends on one screen.
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
}
